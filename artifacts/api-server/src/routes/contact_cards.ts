import { Router, type IRouter, type Request, type Response } from "express";
import { eq, asc } from "drizzle-orm";
import multer from "multer";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { db } from "@workspace/db";
import { contactCardsTable } from "@workspace/db";
import { objectStorageClient, ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const objectStorageService = new ObjectStorageService();

const MAX_WIDTH = 512;

async function resizeIfNeeded(buffer: Buffer, mimetype: string): Promise<Buffer> {
  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || metadata.width <= MAX_WIDTH) return buffer;
  const resizer = sharp(buffer).resize({ width: MAX_WIDTH, withoutEnlargement: true });
  if (mimetype === "image/png") return resizer.png().toBuffer();
  return resizer.jpeg({ quality: 85 }).toBuffer();
}

router.get("/blocks/:blockId/contact-cards", async (req: Request, res: Response) => {
  const blockId = parseInt(req.params.blockId, 10);
  if (isNaN(blockId)) { res.status(400).json({ error: "Invalid blockId" }); return; }
  const rows = await db
    .select()
    .from(contactCardsTable)
    .where(eq(contactCardsTable.blockId, blockId))
    .orderBy(asc(contactCardsTable.sortOrder), asc(contactCardsTable.createdAt));
  res.json(rows);
});

router.post("/blocks/:blockId/contact-cards", async (req: Request, res: Response) => {
  const blockId = parseInt(req.params.blockId, 10);
  if (isNaN(blockId)) { res.status(400).json({ error: "Invalid blockId" }); return; }
  const { firstName, lastName, description, email, phone, color } = req.body;
  if (!firstName?.trim() || !lastName?.trim()) {
    res.status(400).json({ error: "firstName and lastName are required" });
    return;
  }
  const existing = await db
    .select({ sortOrder: contactCardsTable.sortOrder })
    .from(contactCardsTable)
    .where(eq(contactCardsTable.blockId, blockId));
  const maxOrder = existing.length > 0 ? Math.max(...existing.map((r) => r.sortOrder)) : -1;
  const [row] = await db
    .insert(contactCardsTable)
    .values({
      blockId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      description: description?.trim() || null,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      color: color || "#4f46e5",
      sortOrder: maxOrder + 1,
    })
    .returning();
  res.status(201).json(row);
});

router.put("/blocks/:blockId/contact-cards/reorder", async (req: Request, res: Response) => {
  const blockId = parseInt(req.params.blockId, 10);
  if (isNaN(blockId)) { res.status(400).json({ error: "Invalid blockId" }); return; }
  const { ids } = req.body;
  if (!Array.isArray(ids)) { res.status(400).json({ error: "ids must be an array" }); return; }
  await Promise.all(
    (ids as number[]).map((id, index) =>
      db
        .update(contactCardsTable)
        .set({ sortOrder: index, updatedAt: new Date() })
        .where(eq(contactCardsTable.id, id))
    )
  );
  res.status(204).end();
});

router.put("/contact-cards/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { firstName, lastName, description, email, phone, color } = req.body;
  if (!firstName?.trim() || !lastName?.trim()) {
    res.status(400).json({ error: "firstName and lastName are required" });
    return;
  }
  const [row] = await db
    .update(contactCardsTable)
    .set({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      description: description?.trim() || null,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      color: color || "#4f46e5",
      updatedAt: new Date(),
    })
    .where(eq(contactCardsTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Contact card not found" }); return; }
  res.json(row);
});

router.delete("/contact-cards/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(contactCardsTable).where(eq(contactCardsTable.id, id));
  res.status(204).end();
});

router.post("/contact-cards/:id/photo", upload.single("file"), async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }

  const [card] = await db.select().from(contactCardsTable).where(eq(contactCardsTable.id, id));
  if (!card) { res.status(404).json({ error: "Contact card not found" }); return; }

  try {
    const resizedBuffer = await resizeIfNeeded(req.file.buffer, req.file.mimetype);
    const privateObjectDir = objectStorageService.getPrivateObjectDir();
    const objectId = randomUUID();
    const ext = (req.file.originalname.split(".").pop() || "jpg").toLowerCase();
    const fullPath = `${privateObjectDir}/contacts/${objectId}.${ext}`;

    const pathWithSlash = fullPath.startsWith("/") ? fullPath : `/${fullPath}`;
    const parts = pathWithSlash.split("/");
    const bucketName = parts[1];
    const objectName = parts.slice(2).join("/");

    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    await file.save(resizedBuffer, { metadata: { contentType: req.file.mimetype } });

    const storageUrl = `https://storage.googleapis.com/${bucketName}/${objectName}`;
    const objectPath = objectStorageService.normalizeObjectEntityPath(storageUrl);

    const [updated] = await db
      .update(contactCardsTable)
      .set({ photoPath: objectPath, updatedAt: new Date() })
      .where(eq(contactCardsTable.id, id))
      .returning();
    res.json(updated);
  } catch (err) {
    console.error("Contact photo upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

router.delete("/contact-cards/:id/photo", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [updated] = await db
    .update(contactCardsTable)
    .set({ photoPath: null, updatedAt: new Date() })
    .where(eq(contactCardsTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Contact card not found" }); return; }
  res.json(updated);
});

export default router;
