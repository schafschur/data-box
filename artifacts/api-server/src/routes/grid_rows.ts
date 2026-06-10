import { Router, type IRouter, type Request, type Response } from "express";
import { eq, asc, max, and, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import { gridRowsTable } from "@workspace/db";
import {
  ListGridRowsParams,
  CreateGridRowParams,
  CreateGridRowBody,
  UpdateGridRowParams,
  UpdateGridRowBody,
  DeleteGridRowParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/blocks/:blockId/grid-rows", async (req: Request, res: Response) => {
  const { blockId } = ListGridRowsParams.parse(req.params);
  const weekOf = req.query.weekOf as string | undefined;

  const rows = await db
    .select()
    .from(gridRowsTable)
    .where(
      weekOf
        ? and(eq(gridRowsTable.blockId, blockId), eq(gridRowsTable.weekOf, weekOf))
        : and(eq(gridRowsTable.blockId, blockId), isNull(gridRowsTable.weekOf))
    )
    .orderBy(asc(gridRowsTable.position), asc(gridRowsTable.id));
  res.json(rows);
});

router.post("/blocks/:blockId/grid-rows", async (req: Request, res: Response) => {
  const { blockId } = CreateGridRowParams.parse(req.params);
  const parsed = CreateGridRowBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const weekOf = parsed.data.weekOf ?? null;

  const [maxResult] = await db
    .select({ maxPos: max(gridRowsTable.position) })
    .from(gridRowsTable)
    .where(
      weekOf
        ? and(eq(gridRowsTable.blockId, blockId), eq(gridRowsTable.weekOf, weekOf))
        : and(eq(gridRowsTable.blockId, blockId), isNull(gridRowsTable.weekOf))
    );
  const nextPosition = (maxResult?.maxPos ?? -1) + 1;

  const { weekOf: _weekOf, ...rest } = parsed.data;
  const [row] = await db
    .insert(gridRowsTable)
    .values({ blockId, position: nextPosition, weekOf, ...rest })
    .returning();
  res.status(201).json(row);
});

router.put("/grid-rows/:id", async (req: Request, res: Response) => {
  const { id } = UpdateGridRowParams.parse(req.params);
  const parsed = UpdateGridRowBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [row] = await db
    .update(gridRowsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(gridRowsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Grid row not found" });
    return;
  }
  res.json(row);
});

router.delete("/grid-rows/:id", async (req: Request, res: Response) => {
  const { id } = DeleteGridRowParams.parse(req.params);
  await db.delete(gridRowsTable).where(eq(gridRowsTable.id, id));
  res.status(204).end();
});

export default router;
