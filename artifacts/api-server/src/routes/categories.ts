import { Router, type IRouter, type Request, type Response } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { categoriesTable, instancesTable } from "@workspace/db";
import {
  CreateCategoryBody,
  UpdateCategoryBody,
  GetCategoryParams,
  UpdateCategoryParams,
  DeleteCategoryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/categories", async (_req: Request, res: Response) => {
  const rows = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      description: categoriesTable.description,
      color: categoriesTable.color,
      createdAt: categoriesTable.createdAt,
      updatedAt: categoriesTable.updatedAt,
      instanceCount: sql<number>`cast(count(${instancesTable.id}) as int)`,
    })
    .from(categoriesTable)
    .leftJoin(instancesTable, eq(instancesTable.categoryId, categoriesTable.id))
    .groupBy(categoriesTable.id)
    .orderBy(categoriesTable.createdAt);
  res.json(rows);
});

router.post("/categories", async (req: Request, res: Response) => {
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [row] = await db
    .insert(categoriesTable)
    .values(parsed.data)
    .returning();
  res.status(201).json({ ...row, instanceCount: 0 });
});

router.get("/categories/:id", async (req: Request, res: Response) => {
  const { id } = GetCategoryParams.parse(req.params);
  const [row] = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      description: categoriesTable.description,
      color: categoriesTable.color,
      createdAt: categoriesTable.createdAt,
      updatedAt: categoriesTable.updatedAt,
      instanceCount: sql<number>`cast(count(${instancesTable.id}) as int)`,
    })
    .from(categoriesTable)
    .leftJoin(instancesTable, eq(instancesTable.categoryId, categoriesTable.id))
    .where(eq(categoriesTable.id, id))
    .groupBy(categoriesTable.id);
  if (!row) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  res.json(row);
});

router.put("/categories/:id", async (req: Request, res: Response) => {
  const { id } = UpdateCategoryParams.parse(req.params);
  const parsed = UpdateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [row] = await db
    .update(categoriesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(categoriesTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  const [withCount] = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      description: categoriesTable.description,
      color: categoriesTable.color,
      createdAt: categoriesTable.createdAt,
      updatedAt: categoriesTable.updatedAt,
      instanceCount: sql<number>`cast(count(${instancesTable.id}) as int)`,
    })
    .from(categoriesTable)
    .leftJoin(instancesTable, eq(instancesTable.categoryId, categoriesTable.id))
    .where(eq(categoriesTable.id, id))
    .groupBy(categoriesTable.id);
  res.json(withCount);
});

router.delete("/categories/:id", async (req: Request, res: Response) => {
  const { id } = DeleteCategoryParams.parse(req.params);
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  res.status(204).end();
});

export default router;
