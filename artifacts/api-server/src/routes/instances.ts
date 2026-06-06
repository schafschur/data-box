import { Router, type IRouter, type Request, type Response } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { instancesTable, blocksTable } from "@workspace/db";
import {
  ListInstancesParams,
  CreateInstanceParams,
  CreateInstanceBody,
  GetInstanceParams,
  UpdateInstanceParams,
  UpdateInstanceBody,
  DeleteInstanceParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/categories/:categoryId/instances", async (req: Request, res: Response) => {
  const { categoryId } = ListInstancesParams.parse(req.params);
  const rows = await db
    .select({
      id: instancesTable.id,
      categoryId: instancesTable.categoryId,
      name: instancesTable.name,
      description: instancesTable.description,
      createdAt: instancesTable.createdAt,
      updatedAt: instancesTable.updatedAt,
      blockCount: sql<number>`cast(count(${blocksTable.id}) as int)`,
    })
    .from(instancesTable)
    .leftJoin(blocksTable, eq(blocksTable.instanceId, instancesTable.id))
    .where(eq(instancesTable.categoryId, categoryId))
    .groupBy(instancesTable.id)
    .orderBy(instancesTable.createdAt);
  res.json(rows);
});

router.post("/categories/:categoryId/instances", async (req: Request, res: Response) => {
  const { categoryId } = CreateInstanceParams.parse(req.params);
  const parsed = CreateInstanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [row] = await db
    .insert(instancesTable)
    .values({ ...parsed.data, categoryId })
    .returning();
  res.status(201).json({ ...row, blockCount: 0 });
});

router.get("/instances/:id", async (req: Request, res: Response) => {
  const { id } = GetInstanceParams.parse(req.params);
  const [row] = await db
    .select({
      id: instancesTable.id,
      categoryId: instancesTable.categoryId,
      name: instancesTable.name,
      description: instancesTable.description,
      createdAt: instancesTable.createdAt,
      updatedAt: instancesTable.updatedAt,
      blockCount: sql<number>`cast(count(${blocksTable.id}) as int)`,
    })
    .from(instancesTable)
    .leftJoin(blocksTable, eq(blocksTable.instanceId, instancesTable.id))
    .where(eq(instancesTable.id, id))
    .groupBy(instancesTable.id);
  if (!row) {
    res.status(404).json({ error: "Instance not found" });
    return;
  }
  res.json(row);
});

router.put("/instances/:id", async (req: Request, res: Response) => {
  const { id } = UpdateInstanceParams.parse(req.params);
  const parsed = UpdateInstanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [row] = await db
    .update(instancesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(instancesTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Instance not found" });
    return;
  }
  const [withCount] = await db
    .select({
      id: instancesTable.id,
      categoryId: instancesTable.categoryId,
      name: instancesTable.name,
      description: instancesTable.description,
      createdAt: instancesTable.createdAt,
      updatedAt: instancesTable.updatedAt,
      blockCount: sql<number>`cast(count(${blocksTable.id}) as int)`,
    })
    .from(instancesTable)
    .leftJoin(blocksTable, eq(blocksTable.instanceId, instancesTable.id))
    .where(eq(instancesTable.id, id))
    .groupBy(instancesTable.id);
  res.json(withCount);
});

router.delete("/instances/:id", async (req: Request, res: Response) => {
  const { id } = DeleteInstanceParams.parse(req.params);
  await db.delete(instancesTable).where(eq(instancesTable.id, id));
  res.status(204).end();
});

export default router;
