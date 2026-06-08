import { Router, type IRouter, type Request, type Response } from "express";
import { gte, lte, and, asc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { calendarEventsTable, blocksTable, instancesTable, categoriesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/upcoming-events", async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);

    const todayStr = today.toISOString().split("T")[0];
    const in7DaysStr = in7Days.toISOString().split("T")[0];

    const rows = await db
      .select({
        id: calendarEventsTable.id,
        title: calendarEventsTable.title,
        date: calendarEventsTable.date,
        description: calendarEventsTable.description,
        blockId: calendarEventsTable.blockId,
        blockTitle: blocksTable.title,
        instanceId: instancesTable.id,
        instanceName: instancesTable.name,
        categoryId: categoriesTable.id,
        categoryName: categoriesTable.name,
        categoryColor: categoriesTable.color,
      })
      .from(calendarEventsTable)
      .innerJoin(blocksTable, eq(calendarEventsTable.blockId, blocksTable.id))
      .innerJoin(instancesTable, eq(blocksTable.instanceId, instancesTable.id))
      .innerJoin(categoriesTable, eq(instancesTable.categoryId, categoriesTable.id))
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

/* ── All calendar events (universal calendar) ──────────────────────── */
router.get("/all-calendar-events", async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        id:            calendarEventsTable.id,
        title:         calendarEventsTable.title,
        date:          calendarEventsTable.date,
        description:   calendarEventsTable.description,
        highPriority:  calendarEventsTable.highPriority,
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
      .orderBy(asc(calendarEventsTable.date));
    res.json(rows);
  } catch (err) {
    console.error("All calendar events error:", err);
    res.status(500).json({ error: "Failed to fetch calendar events" });
  }
});

export default router;
