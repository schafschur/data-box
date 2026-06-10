import { Router, type IRouter, type Request, type Response } from "express";
import { gte, lte, and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import { calendarEventsTable, blocksTable, instancesTable, categoriesTable, todoItemsTable, locationsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/upcoming-events", async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);

    const todayStr  = today.toISOString().split("T")[0];
    const in7DaysStr = in7Days.toISOString().split("T")[0];

    const rows = await db
      .select({
        id:            calendarEventsTable.id,
        title:         calendarEventsTable.title,
        date:          calendarEventsTable.date,
        description:   calendarEventsTable.description,
        sortOrder:     calendarEventsTable.sortOrder,
        locationId:    calendarEventsTable.locationId,
        locationName:  locationsTable.name,
        locationColor: locationsTable.color,
        blockId:       calendarEventsTable.blockId,
        blockTitle:    blocksTable.title,
        instanceId:    instancesTable.id,
        instanceName:  instancesTable.name,
        categoryId:    categoriesTable.id,
        categoryName:  categoriesTable.name,
        categoryColor: categoriesTable.color,
      })
      .from(calendarEventsTable)
      .innerJoin(blocksTable,    eq(calendarEventsTable.blockId, blocksTable.id))
      .innerJoin(instancesTable, eq(blocksTable.instanceId, instancesTable.id))
      .innerJoin(categoriesTable, eq(instancesTable.categoryId, categoriesTable.id))
      .leftJoin(locationsTable,  eq(calendarEventsTable.locationId, locationsTable.id))
      .where(
        and(
          gte(calendarEventsTable.date, todayStr),
          lte(calendarEventsTable.date, in7DaysStr),
        ),
      )
      .orderBy(asc(calendarEventsTable.date));

    res.json(rows);
  } catch (err) {
    console.error("Upcoming events error:", err);
    res.status(500).json({ error: "Failed to fetch upcoming events" });
  }
});

/* ── Urgent todo items (due today or tomorrow, not completed) ───────── */
router.get("/urgent-todos", async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const todayStr    = today.toISOString().split("T")[0];
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const rows = await db
      .select({
        id:            todoItemsTable.id,
        text:          todoItemsTable.text,
        deadline:      todoItemsTable.deadline,
        completed:     todoItemsTable.completed,
        blockId:       todoItemsTable.blockId,
        blockTitle:    blocksTable.title,
        instanceId:    instancesTable.id,
        instanceName:  instancesTable.name,
        categoryId:    categoriesTable.id,
        categoryName:  categoriesTable.name,
        categoryColor: categoriesTable.color,
      })
      .from(todoItemsTable)
      .innerJoin(blocksTable,     eq(todoItemsTable.blockId, blocksTable.id))
      .innerJoin(instancesTable,  eq(blocksTable.instanceId, instancesTable.id))
      .innerJoin(categoriesTable, eq(instancesTable.categoryId, categoriesTable.id))
      .where(
        and(
          inArray(todoItemsTable.deadline, [todayStr, tomorrowStr]),
          eq(todoItemsTable.completed, false)
        )
      )
      .orderBy(asc(todoItemsTable.deadline), asc(todoItemsTable.id));

    res.json(rows);
  } catch (err) {
    console.error("Urgent todos error:", err);
    res.status(500).json({ error: "Failed to fetch urgent todos" });
  }
});

/* ── All calendar events (universal calendar) ──────────────────────── */
router.get("/all-calendar-events", async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        id:            calendarEventsTable.id,
        title:         calendarEventsTable.title,
        date:          calendarEventsTable.date,
        endDate:       calendarEventsTable.endDate,
        startTime:     calendarEventsTable.startTime,
        endTime:       calendarEventsTable.endTime,
        description:   calendarEventsTable.description,
        highPriority:  calendarEventsTable.highPriority,
        sortOrder:     calendarEventsTable.sortOrder,
        locationId:    calendarEventsTable.locationId,
        locationName:  locationsTable.name,
        locationColor: locationsTable.color,
        blockId:       calendarEventsTable.blockId,
        instanceId:    instancesTable.id,
        instanceName:  instancesTable.name,
        categoryId:    categoriesTable.id,
        categoryName:  categoriesTable.name,
        categoryColor: categoriesTable.color,
      })
      .from(calendarEventsTable)
      .innerJoin(blocksTable,     eq(calendarEventsTable.blockId, blocksTable.id))
      .innerJoin(instancesTable,  eq(blocksTable.instanceId, instancesTable.id))
      .innerJoin(categoriesTable, eq(instancesTable.categoryId, categoriesTable.id))
      .leftJoin(locationsTable,   eq(calendarEventsTable.locationId, locationsTable.id))
      .orderBy(asc(calendarEventsTable.date));
    res.json(rows);
  } catch (err) {
    console.error("All calendar events error:", err);
    res.status(500).json({ error: "Failed to fetch calendar events" });
  }
});

export default router;
