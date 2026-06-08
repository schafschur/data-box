import { Router, type IRouter, type Request, type Response } from "express";
import { eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  instancesTable,
  blocksTable,
  todoItemsTable,
  calendarEventsTable,
} from "@workspace/db";

const router: IRouter = Router();

function parseId(raw: unknown): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

router.get("/instances/:id/map-data", async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const [instance] = await db.select().from(instancesTable).where(eq(instancesTable.id, id));
  if (!instance) { res.status(404).json({ error: "Instance not found" }); return; }

  const blocks = await db.select().from(blocksTable).where(eq(blocksTable.instanceId, id));

  const todoBlockIds = blocks.filter((b) => b.type === "todo").map((b) => b.id);
  const calendarBlockIds = blocks.filter((b) => b.type === "calendar").map((b) => b.id);

  const todoItems = todoBlockIds.length
    ? await db.select().from(todoItemsTable).where(inArray(todoItemsTable.blockId, todoBlockIds))
    : [];

  const calendarEvents = calendarBlockIds.length
    ? await db.select().from(calendarEventsTable).where(inArray(calendarEventsTable.blockId, calendarBlockIds))
    : [];

  res.json({ blocks, todoItems, calendarEvents });
});

router.get("/instances/:id/map-layout", async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const [instance] = await db.select().from(instancesTable).where(eq(instancesTable.id, id));
  if (!instance) { res.status(404).json({ error: "Instance not found" }); return; }

  res.json(instance.mapLayout ?? { nodePositions: {}, customEdges: [] });
});

router.put("/instances/:id/map-layout", async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }

  const body = req.body;
  if (!body || typeof body.nodePositions !== "object" || !Array.isArray(body.customEdges)) {
    res.status(400).json({ error: "Invalid layout" });
    return;
  }

  const layout = {
    nodePositions: body.nodePositions as Record<string, { x: number; y: number }>,
    customEdges: body.customEdges as Array<{ id: string; source: string; target: string }>,
  };

  const [row] = await db
    .update(instancesTable)
    .set({ mapLayout: layout, updatedAt: new Date() })
    .where(eq(instancesTable.id, id))
    .returning();

  if (!row) { res.status(404).json({ error: "Instance not found" }); return; }
  res.json(layout);
});

export default router;
