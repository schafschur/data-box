import { Router, type IRouter, type Request, type Response } from "express";
import { eq, asc } from "drizzle-orm";
import multer from "multer";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { photosTable } from "@workspace/db";
import {
  ListPhotosParams,
  AddPhotoParams,
  AddPhotoBody,
  UpdatePhotoParams,
  UpdatePhotoBody,
  DeletePhotoParams,
} from "@workspace/api-zod";
import { objectStorageClient, ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const objectStorageService = new ObjectStorageService();

router.get("/blocks/:blockId/photos", async (req: Request, res: Response) => {
  const { blockId } = ListPhotosParams.parse(req.params);
  const rows = await db
    .select()
    .from(photosTable)
    .where(eq(photosTable.blockId, blockId))
    .orderBy(asc(photosTable.createdAt));
  res.json(rows);
});

router.post("/blocks/:blockId/photos/upload", upload.single("file"), async (req: Request, res: Response) => {
  const { blockId } = AddPhotoParams.parse(req.params);

  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  try {
    const privateObjectDir = objectStorageService.getPrivateObjectDir();
    const objectId = randomUUID();
    const ext = (req.file.originalname.split(".").pop() || "jpg").toLowerCase();
    const fullPath = `${privateObjectDir}/uploads/${objectId}.${ext}`;

    const pathWithSlash = fullPath.startsWith("/") ? fullPath : `/${fullPath}`;
    const parts = pathWithSlash.split("/");
    const bucketName = parts[1];
    const objectName = parts.slice(2).join("/");

    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    await file.save(req.file.buffer, {
      metadata: { contentType: req.file.mimetype },
    });

    const storageUrl = `https://storage.googleapis.com/${bucketName}/${objectName}`;
    const objectPath = objectStorageService.normalizeObjectEntityPath(storageUrl);

    const caption = typeof req.body.caption === "string" && req.body.caption.trim()
      ? req.body.caption.trim()
      : null;

    const [row] = await db
      .insert(photosTable)
      .values({ objectPath, blockId, ...(caption ? { caption } : {}) })
      .returning();

    res.status(201).json(row);
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Storage not found" });
    } else {
      console.error("Photo upload error:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  }
});

router.post("/blocks/:blockId/photos", async (req: Request, res: Response) => {
  const { blockId } = AddPhotoParams.parse(req.params);
  const parsed = AddPhotoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [row] = await db
    .insert(photosTable)
    .values({ ...parsed.data, blockId })
    .returning();
  res.status(201).json(row);
});

router.put("/photos/:id", async (req: Request, res: Response) => {
  const { id } = UpdatePhotoParams.parse(req.params);
  const parsed = UpdatePhotoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [row] = await db
    .update(photosTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(photosTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Photo not found" });
    return;
  }
  res.json(row);
});

router.delete("/photos/:id", async (req: Request, res: Response) => {
  const { id } = DeletePhotoParams.parse(req.params);
  await db.delete(photosTable).where(eq(photosTable.id, id));
  res.status(204).end();
});

export default router;
