import { Router, type IRouter, type Request, type Response } from "express";
import { eq, asc } from "drizzle-orm";
import { db } from "@workspace/db";
import { calendarEventsTable, locationsTable } from "@workspace/db";
import {
  ListCalendarEventsParams,
  CreateCalendarEventParams,
  CreateCalendarEventBody,
  UpdateCalendarEventParams,
  UpdateCalendarEventBody,
  DeleteCalendarEventParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/blocks/:blockId/calendar-events", async (req: Request, res: Response) => {
  const { blockId } = ListCalendarEventsParams.parse(req.params);
  const rows = await db
    .select({
      id:            calendarEventsTable.id,
      blockId:       calendarEventsTable.blockId,
      locationId:    calendarEventsTable.locationId,
      locationName:  locationsTable.name,
      locationColor: locationsTable.color,
      title:         calendarEventsTable.title,
      date:          calendarEventsTable.date,
      endDate:       calendarEventsTable.endDate,
      startTime:     calendarEventsTable.startTime,
      endTime:       calendarEventsTable.endTime,
      description:   calendarEventsTable.description,
      highPriority:  calendarEventsTable.highPriority,
      sortOrder:     calendarEventsTable.sortOrder,
      createdAt:     calendarEventsTable.createdAt,
      updatedAt:     calendarEventsTable.updatedAt,
    })
    .from(calendarEventsTable)
    .leftJoin(locationsTable, eq(calendarEventsTable.locationId, locationsTable.id))
    .where(eq(calendarEventsTable.blockId, blockId))
    .orderBy(asc(calendarEventsTable.date));
  res.json(rows);
});

router.post("/blocks/:blockId/calendar-events", async (req: Request, res: Response) => {
  const { blockId } = CreateCalendarEventParams.parse(req.params);
  const parsed = CreateCalendarEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const dateStr = parsed.data.date instanceof Date
    ? parsed.data.date.toISOString().split("T")[0]
    : String(parsed.data.date);
  const [row] = await db
    .insert(calendarEventsTable)
    .values({
      ...parsed.data,
      date:       dateStr,
      blockId,
      endDate:    parsed.data.endDate    ?? null,
      startTime:  parsed.data.startTime  ?? null,
      endTime:    parsed.data.endTime    ?? null,
      locationId: parsed.data.locationId ?? null,
    })
    .returning();
  const full = await db
    .select({
      id:            calendarEventsTable.id,
      blockId:       calendarEventsTable.blockId,
      locationId:    calendarEventsTable.locationId,
      locationName:  locationsTable.name,
      locationColor: locationsTable.color,
      title:         calendarEventsTable.title,
      date:          calendarEventsTable.date,
      endDate:       calendarEventsTable.endDate,
      startTime:     calendarEventsTable.startTime,
      endTime:       calendarEventsTable.endTime,
      description:   calendarEventsTable.description,
      highPriority:  calendarEventsTable.highPriority,
      sortOrder:     calendarEventsTable.sortOrder,
      createdAt:     calendarEventsTable.createdAt,
      updatedAt:     calendarEventsTable.updatedAt,
    })
    .from(calendarEventsTable)
    .leftJoin(locationsTable, eq(calendarEventsTable.locationId, locationsTable.id))
    .where(eq(calendarEventsTable.id, row.id));
  res.status(201).json(full[0] ?? row);
});

router.put("/calendar-events/reorder", async (req: Request, res: Response) => {
  const body = req.body as { items?: { id: number; sortOrder: number }[] };
  if (!Array.isArray(body?.items) || body.items.some((x) => typeof x.id !== "number" || typeof x.sortOrder !== "number")) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  await Promise.all(
    body.items.map(({ id, sortOrder }) =>
      db
        .update(calendarEventsTable)
        .set({ sortOrder, updatedAt: new Date() })
        .where(eq(calendarEventsTable.id, id)),
    ),
  );
  res.json({ ok: true });
});

router.put("/calendar-events/:id", async (req: Request, res: Response) => {
  const { id } = UpdateCalendarEventParams.parse(req.params);
  const parsed = UpdateCalendarEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const dateStr = parsed.data.date instanceof Date
    ? parsed.data.date.toISOString().split("T")[0]
    : parsed.data.date !== undefined ? String(parsed.data.date) : undefined;
  await db
    .update(calendarEventsTable)
    .set({
      title:       parsed.data.title,
      date:        dateStr,
      endDate:     parsed.data.endDate    !== undefined ? (parsed.data.endDate    ?? null) : undefined,
      startTime:   parsed.data.startTime  !== undefined ? (parsed.data.startTime  ?? null) : undefined,
      endTime:     parsed.data.endTime    !== undefined ? (parsed.data.endTime    ?? null) : undefined,
      description: parsed.data.description,
      locationId:  parsed.data.locationId !== undefined ? (parsed.data.locationId ?? null) : undefined,
      ...(parsed.data.highPriority !== undefined ? { highPriority: parsed.data.highPriority } : {}),
      updatedAt:   new Date(),
    })
    .where(eq(calendarEventsTable.id, id));
  const full = await db
    .select({
      id:            calendarEventsTable.id,
      blockId:       calendarEventsTable.blockId,
      locationId:    calendarEventsTable.locationId,
      locationName:  locationsTable.name,
      locationColor: locationsTable.color,
      title:         calendarEventsTable.title,
      date:          calendarEventsTable.date,
      endDate:       calendarEventsTable.endDate,
      startTime:     calendarEventsTable.startTime,
      endTime:       calendarEventsTable.endTime,
      description:   calendarEventsTable.description,
      highPriority:  calendarEventsTable.highPriority,
      sortOrder:     calendarEventsTable.sortOrder,
      createdAt:     calendarEventsTable.createdAt,
      updatedAt:     calendarEventsTable.updatedAt,
    })
    .from(calendarEventsTable)
    .leftJoin(locationsTable, eq(calendarEventsTable.locationId, locationsTable.id))
    .where(eq(calendarEventsTable.id, id));
  if (!full[0]) {
    res.status(404).json({ error: "Calendar event not found" });
    return;
  }
  res.json(full[0]);
});

router.delete("/calendar-events/:id", async (req: Request, res: Response) => {
  const { id } = DeleteCalendarEventParams.parse(req.params);
  await db.delete(calendarEventsTable).where(eq(calendarEventsTable.id, id));
  res.status(204).end();
});

export default router;
