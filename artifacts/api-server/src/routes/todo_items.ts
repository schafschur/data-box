import { Router, type IRouter, type Request, type Response } from "express";
import { eq, asc } from "drizzle-orm";
import { db } from "@workspace/db";
import { todoItemsTable } from "@workspace/db";
import {
  ListTodoItemsParams,
  CreateTodoItemParams,
  CreateTodoItemBody,
  UpdateTodoItemParams,
  UpdateTodoItemBody,
  DeleteTodoItemParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/blocks/:blockId/todo-items", async (req: Request, res: Response) => {
  const { blockId } = ListTodoItemsParams.parse(req.params);
  const rows = await db
    .select()
    .from(todoItemsTable)
    .where(eq(todoItemsTable.blockId, blockId))
    .orderBy(asc(todoItemsTable.position), asc(todoItemsTable.createdAt));
  res.json(rows);
});

router.post("/blocks/:blockId/todo-items", async (req: Request, res: Response) => {
  const { blockId } = CreateTodoItemParams.parse(req.params);
  const parsed = CreateTodoItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const existing = await db
    .select({ id: todoItemsTable.id })
    .from(todoItemsTable)
    .where(eq(todoItemsTable.blockId, blockId));
  const position = existing.length;
  const [row] = await db
    .insert(todoItemsTable)
    .values({ ...parsed.data, blockId, position })
    .returning();
  res.status(201).json(row);
});

router.put("/todo-items/:id", async (req: Request, res: Response) => {
  const { id } = UpdateTodoItemParams.parse(req.params);
  const parsed = UpdateTodoItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [row] = await db
    .update(todoItemsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(todoItemsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Todo item not found" });
    return;
  }
  res.json(row);
});

router.delete("/todo-items/:id", async (req: Request, res: Response) => {
  const { id } = DeleteTodoItemParams.parse(req.params);
  await db.delete(todoItemsTable).where(eq(todoItemsTable.id, id));
  res.status(204).end();
});

export default router;
