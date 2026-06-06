import { Router, type IRouter, type Request, type Response } from "express";
import { eq, asc } from "drizzle-orm";
import { db } from "@workspace/db";
import { blocksTable } from "@workspace/db";
import {
  ListBlocksParams,
  CreateBlockParams,
  CreateBlockBody,
  GetBlockParams,
  UpdateBlockParams,
  UpdateBlockBody,
  DeleteBlockParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/instances/:instanceId/blocks", async (req: Request, res: Response) => {
  const { instanceId } = ListBlocksParams.parse(req.params);
  const rows = await db
    .select()
    .from(blocksTable)
    .where(eq(blocksTable.instanceId, instanceId))
    .orderBy(asc(blocksTable.position), asc(blocksTable.createdAt));
  res.json(rows);
});

router.post("/instances/:instanceId/blocks", async (req: Request, res: Response) => {
  const { instanceId } = CreateBlockParams.parse(req.params);
  const parsed = CreateBlockBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const existingBlocks = await db
    .select({ id: blocksTable.id })
    .from(blocksTable)
    .where(eq(blocksTable.instanceId, instanceId));
  const position = existingBlocks.length;
  const [row] = await db
    .insert(blocksTable)
    .values({ ...parsed.data, instanceId, position })
    .returning();
  res.status(201).json(row);
});

router.get("/blocks/:id", async (req: Request, res: Response) => {
  const { id } = GetBlockParams.parse(req.params);
  const [row] = await db.select().from(blocksTable).where(eq(blocksTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Block not found" });
    return;
  }
  res.json(row);
});

router.put("/blocks/:id", async (req: Request, res: Response) => {
  const { id } = UpdateBlockParams.parse(req.params);
  const parsed = UpdateBlockBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [row] = await db
    .update(blocksTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(blocksTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Block not found" });
    return;
  }
  res.json(row);
});

router.delete("/blocks/:id", async (req: Request, res: Response) => {
  const { id } = DeleteBlockParams.parse(req.params);
  await db.delete(blocksTable).where(eq(blocksTable.id, id));
  res.status(204).end();
});

export default router;
