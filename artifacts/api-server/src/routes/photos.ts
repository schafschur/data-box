import { Router, type IRouter, type Request, type Response } from "express";
import { eq, asc } from "drizzle-orm";
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

const router: IRouter = Router();

router.get("/blocks/:blockId/photos", async (req: Request, res: Response) => {
  const { blockId } = ListPhotosParams.parse(req.params);
  const rows = await db
    .select()
    .from(photosTable)
    .where(eq(photosTable.blockId, blockId))
    .orderBy(asc(photosTable.createdAt));
  res.json(rows);
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
