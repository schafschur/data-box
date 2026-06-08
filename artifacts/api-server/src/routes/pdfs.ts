import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import multer from "multer";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { blocksTable } from "@workspace/db";
import { objectStorageClient, ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });
const objectStorageService = new ObjectStorageService();

interface PdfEntry {
  objectPath: string;
  filename: string;
  size: number;
  uploadedAt: string;
}

interface PdfBlockContent {
  pdfs?: PdfEntry[];
}

router.post("/blocks/:blockId/pdfs/upload", upload.single("file"), async (req: Request, res: Response) => {
  const blockId = parseInt(String(req.params.blockId), 10);
  if (isNaN(blockId)) {
    res.status(400).json({ error: "Invalid blockId" });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const isPdf =
    req.file.mimetype === "application/pdf" ||
    req.file.originalname.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    res.status(400).json({ error: "Only PDF files are accepted" });
    return;
  }

  try {
    const [block] = await db.select().from(blocksTable).where(eq(blocksTable.id, blockId));
    if (!block) {
      res.status(404).json({ error: "Block not found" });
      return;
    }

    const privateObjectDir = objectStorageService.getPrivateObjectDir();
    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}.pdf`;

    const pathWithSlash = fullPath.startsWith("/") ? fullPath : `/${fullPath}`;
    const parts = pathWithSlash.split("/");
    const bucketName = parts[1];
    const objectName = parts.slice(2).join("/");

    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    await file.save(req.file.buffer, {
      metadata: { contentType: "application/pdf" },
    });

    const storageUrl = `https://storage.googleapis.com/${bucketName}/${objectName}`;
    const objectPath = objectStorageService.normalizeObjectEntityPath(storageUrl);

    const newEntry: PdfEntry = {
      objectPath,
      filename: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
    };

    const existingContent = (block.content ?? {}) as PdfBlockContent;
    const existingPdfs = existingContent.pdfs ?? [];
    const newContent: PdfBlockContent = { ...existingContent, pdfs: [...existingPdfs, newEntry] };

    await db
      .update(blocksTable)
      .set({ content: newContent, updatedAt: new Date() })
      .where(eq(blocksTable.id, blockId));

    res.status(201).json(newEntry);
  } catch (err) {
    console.error("PDF upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

router.delete("/blocks/:blockId/pdfs", async (req: Request, res: Response) => {
  const blockId = parseInt(String(req.params.blockId), 10);
  if (isNaN(blockId)) {
    res.status(400).json({ error: "Invalid blockId" });
    return;
  }

  const { objectPath } = req.body as { objectPath?: string };
  if (!objectPath) {
    res.status(400).json({ error: "objectPath is required" });
    return;
  }

  try {
    const [block] = await db.select().from(blocksTable).where(eq(blocksTable.id, blockId));
    if (!block) {
      res.status(404).json({ error: "Block not found" });
      return;
    }

    const existingContent = (block.content ?? {}) as PdfBlockContent;
    const existingPdfs = existingContent.pdfs ?? [];
    const newPdfs = existingPdfs.filter((p) => p.objectPath !== objectPath);
    const newContent: PdfBlockContent = { ...existingContent, pdfs: newPdfs };

    await db
      .update(blocksTable)
      .set({ content: newContent, updatedAt: new Date() })
      .where(eq(blocksTable.id, blockId));

    try {
      const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
      await objectFile.delete();
    } catch (_) {
    }

    res.status(204).end();
  } catch (err) {
    console.error("PDF delete error:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

export default router;
