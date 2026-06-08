import { Router, type IRouter, type Request, type Response } from "express";
import { eq, asc } from "drizzle-orm";
import { db } from "@workspace/db";
import { listItemsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/blocks/:blockId/list-items", async (req: Request, res: Response) => {
  const blockId = parseInt(req.params.blockId, 10);
  if (isNaN(blockId)) { res.status(400).json({ error: "Invalid blockId" }); return; }
  const rows = await db
    .select()
    .from(listItemsTable)
    .where(eq(listItemsTable.blockId, blockId))
    .orderBy(asc(listItemsTable.sortOrder), asc(listItemsTable.createdAt));
  res.json(rows);
});

router.post("/blocks/:blockId/list-items", async (req: Request, res: Response) => {
  const blockId = parseInt(req.params.blockId, 10);
  if (isNaN(blockId)) { res.status(400).json({ error: "Invalid blockId" }); return; }
  const { title, description, notes } = req.body;
  if (!title?.trim()) {
    res.status(400).json({ error: "title is required" });
    return;
  }
  const existing = await db
    .select({ sortOrder: listItemsTable.sortOrder })
    .from(listItemsTable)
    .where(eq(listItemsTable.blockId, blockId));
  const maxOrder = existing.length > 0 ? Math.max(...existing.map((r) => r.sortOrder)) : -1;
  const [row] = await db
    .insert(listItemsTable)
    .values({
      blockId,
      title: title.trim(),
      description: description?.trim() || null,
      notes: notes?.trim() || null,
      sortOrder: maxOrder + 1,
    })
    .returning();
  res.status(201).json(row);
});

router.put("/blocks/:blockId/list-items/reorder", async (req: Request, res: Response) => {
  const blockId = parseInt(req.params.blockId, 10);
  if (isNaN(blockId)) { res.status(400).json({ error: "Invalid blockId" }); return; }
  const { ids } = req.body;
  if (!Array.isArray(ids)) { res.status(400).json({ error: "ids must be an array" }); return; }
  await Promise.all(
    (ids as number[]).map((id, index) =>
      db
        .update(listItemsTable)
        .set({ sortOrder: index, updatedAt: new Date() })
        .where(eq(listItemsTable.id, id))
    )
  );
  res.status(204).end();
});

router.put("/list-items/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { title, description, notes } = req.body;
  if (!title?.trim()) {
    res.status(400).json({ error: "title is required" });
    return;
  }
  const [row] = await db
    .update(listItemsTable)
    .set({
      title: title.trim(),
      description: description?.trim() || null,
      notes: notes?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(listItemsTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "List item not found" }); return; }
  res.json(row);
});

router.delete("/list-items/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(listItemsTable).where(eq(listItemsTable.id, id));
  res.status(204).end();
});

export default router;
