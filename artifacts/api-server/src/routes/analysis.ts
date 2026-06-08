import { Router, type IRouter, type Request, type Response } from "express";
import { eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  instancesTable,
  blocksTable,
  todoItemsTable,
  calendarEventsTable,
  photosTable,
  contactCardsTable,
  listItemsTable,
} from "@workspace/db";
import { GetInstanceAnalysisParams } from "@workspace/api-zod";

const router: IRouter = Router();

const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with","by",
  "from","is","are","was","were","be","been","being","have","has","had","do",
  "does","did","will","would","could","should","may","might","shall","can",
  "it","its","i","me","my","we","our","you","your","he","she","they","them",
  "his","her","this","that","these","those","not","no","so","if","as","up",
  "out","about","into","than","then","there","when","where","which","who",
]);

const BLOCK_LABELS: Record<string, string> = {
  richtext: "Rich Text",
  todo: "To-do",
  calendar: "Calendar",
  photo: "Photos",
  pdf: "PDF",
  contact: "Contacts",
  list: "List",
};

function extractKeywords(html: string): Map<string, number> {
  const text = html.replace(/<[^>]+>/g, " ").toLowerCase();
  const words = text.match(/[a-z]{3,}/g) ?? [];
  const freq = new Map<string, number>();
  for (const w of words) {
    if (!STOP_WORDS.has(w)) {
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }
  return freq;
}

function countWords(html: string): number {
  const text = html.replace(/<[^>]+>/g, " ");
  return (text.match(/\S+/g) ?? []).length;
}

function getContentHtml(content: unknown): string {
  if (!content) return "";
  if (typeof content === "object" && content !== null && "html" in content) {
    return String((content as { html: unknown }).html || "");
  }
  if (typeof content === "string") return content;
  return "";
}

function maxDate(...dates: (Date | string | null | undefined)[]): Date {
  let best = new Date(0);
  for (const d of dates) {
    if (!d) continue;
    const t = new Date(d).getTime();
    if (t > best.getTime()) best = new Date(d);
  }
  return best;
}

router.get("/instances/:id/analysis", async (req: Request, res: Response) => {
  const { id } = GetInstanceAnalysisParams.parse(req.params);
  const [instance] = await db
    .select()
    .from(instancesTable)
    .where(eq(instancesTable.id, id));
  if (!instance) {
    res.status(404).json({ error: "Instance not found" });
    return;
  }

  const blocks = await db
    .select()
    .from(blocksTable)
    .where(eq(blocksTable.instanceId, id));

  const textBlocks    = blocks.filter((b) => b.type === "richtext");
  const todoBlocks    = blocks.filter((b) => b.type === "todo");
  const calendarBlocks = blocks.filter((b) => b.type === "calendar");
  const photoBlocks   = blocks.filter((b) => b.type === "photo");
  const pdfBlocks     = blocks.filter((b) => b.type === "pdf");
  const contactBlocks = blocks.filter((b) => b.type === "contact");
  const listBlocks    = blocks.filter((b) => b.type === "list");

  const todoBlockIds     = todoBlocks.map((b) => b.id);
  const calendarBlockIds = calendarBlocks.map((b) => b.id);
  const photoBlockIds    = photoBlocks.map((b) => b.id);
  const contactBlockIds  = contactBlocks.map((b) => b.id);
  const listBlockIds     = listBlocks.map((b) => b.id);

  const [allTodoItems, allCalendarEvents, allPhotos, allContactCards, allListItems] =
    await Promise.all([
      todoBlockIds.length
        ? db.select().from(todoItemsTable).where(inArray(todoItemsTable.blockId, todoBlockIds))
        : Promise.resolve([]),
      calendarBlockIds.length
        ? db.select().from(calendarEventsTable).where(inArray(calendarEventsTable.blockId, calendarBlockIds))
        : Promise.resolve([]),
      photoBlockIds.length
        ? db.select().from(photosTable).where(inArray(photosTable.blockId, photoBlockIds))
        : Promise.resolve([]),
      contactBlockIds.length
        ? db.select().from(contactCardsTable).where(inArray(contactCardsTable.blockId, contactBlockIds))
        : Promise.resolve([]),
      listBlockIds.length
        ? db.select().from(listItemsTable).where(inArray(listItemsTable.blockId, listBlockIds))
        : Promise.resolve([]),
    ]);

  const blockTitleMap = new Map(blocks.map((b) => [b.id, b.title]));
  const today = new Date().toISOString().split("T")[0];

  // ── Text stats ───────────────────────────────────────────────────────
  let totalWordCount = 0;
  const keywordFreq = new Map<string, number>();
  for (const b of textBlocks) {
    const html = getContentHtml(b.content);
    if (html) {
      totalWordCount += countWords(html);
      for (const [w, c] of extractKeywords(html)) {
        keywordFreq.set(w, (keywordFreq.get(w) ?? 0) + c);
      }
    }
  }
  const topKeywords = [...keywordFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));

  // ── Todo stats ───────────────────────────────────────────────────────
  const totalItems     = allTodoItems.length;
  const completedItems = allTodoItems.filter((i) => i.completed).length;
  const completionRate = totalItems > 0 ? completedItems / totalItems : 0;

  // ── Calendar stats ───────────────────────────────────────────────────
  const totalEvents    = allCalendarEvents.length;
  const upcomingEvents = allCalendarEvents.filter((e) => e.date >= today).length;
  const overdueEvents  = allCalendarEvents.filter((e) => e.date < today).length;
  const upcoming       = allCalendarEvents
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const nextEvent = upcoming[0] ?? null;

  // ── Photo stats ──────────────────────────────────────────────────────
  let totalPhotos = 0;
  let withCaption = 0;
  let withNotes   = 0;
  let withDate    = 0;
  let earliestDate: string | null = null;
  let latestDate:   string | null = null;
  const monthCounts = new Map<string, number>();

  for (const p of allPhotos) {
    totalPhotos++;
    if (p.caption?.trim()) withCaption++;
    if (p.notes?.trim()) withNotes++;
    if (p.displayDate?.trim()) withDate++;
    const dateStr = p.displayDate?.trim()
      ? p.displayDate
      : p.createdAt.toISOString().slice(0, 10);
    const month = dateStr.slice(0, 7);
    monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
    if (!earliestDate || dateStr < earliestDate) earliestDate = dateStr;
    if (!latestDate   || dateStr > latestDate)   latestDate   = dateStr;
  }
  const byMonth = [...monthCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  // ── Block composition ────────────────────────────────────────────────
  const typeCounts = new Map<string, number>();
  for (const b of blocks) {
    typeCounts.set(b.type, (typeCounts.get(b.type) ?? 0) + 1);
  }
  const blockComposition = [...typeCounts.entries()].map(([type, count]) => ({
    type,
    label: BLOCK_LABELS[type] ?? type,
    count,
  }));

  // ── Upcoming events list (next 3) ─────────────────────────────────────
  const upcomingEventsList = upcoming.slice(0, 3).map((e) => ({
    id:         e.id,
    title:      e.title,
    date:       e.date,
    description: e.description ?? null,
    blockTitle: blockTitleMap.get(e.blockId) ?? null,
  }));

  // ── Activity / freshness (last touched per block type) ───────────────
  const activityMap = new Map<string, Date>();

  function updateActivity(type: string, d: Date) {
    const existing = activityMap.get(type);
    if (!existing || d > existing) activityMap.set(type, d);
  }

  for (const b of textBlocks)    updateActivity("richtext",  new Date(b.updatedAt));
  for (const b of pdfBlocks)     updateActivity("pdf",       new Date(b.updatedAt));
  for (const b of photoBlocks)   updateActivity("photo",     maxDate(b.updatedAt, ...allPhotos.filter(p => p.blockId === b.id).map(p => p.createdAt)));
  for (const b of todoBlocks)    updateActivity("todo",      maxDate(b.updatedAt, ...allTodoItems.filter(i => i.blockId === b.id).map(i => i.updatedAt)));
  for (const b of calendarBlocks) updateActivity("calendar", maxDate(b.updatedAt, ...allCalendarEvents.filter(e => e.blockId === b.id).map(e => e.updatedAt)));
  for (const b of contactBlocks) updateActivity("contact",   maxDate(b.updatedAt, ...allContactCards.filter(c => c.blockId === b.id).map(c => c.updatedAt)));
  for (const b of listBlocks)    updateActivity("list",      maxDate(b.updatedAt, ...allListItems.filter(i => i.blockId === b.id).map(i => i.updatedAt)));

  const activityStats = [...activityMap.entries()]
    .sort(([, a], [, b]) => b.getTime() - a.getTime())
    .map(([type, date]) => ({
      type,
      label:       BLOCK_LABELS[type] ?? type,
      blockCount:  blocks.filter((b) => b.type === type).length,
      lastUpdated: date.toISOString(),
    }));

  // ── Overdue todos (incomplete, created > 7 days ago) ─────────────────
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const staleItems = allTodoItems.filter(
    (i) => !i.completed && new Date(i.createdAt) < sevenDaysAgo,
  );
  const overdueStats = {
    count: staleItems.length,
    items: staleItems
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, 5)
      .map((i) => ({
        id:         i.id,
        text:       i.text,
        blockTitle: blockTitleMap.get(i.blockId) ?? null,
        daysOld:    Math.floor((Date.now() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
      })),
  };

  res.json({
    instanceId:   id,
    totalBlocks:  blocks.length,
    textStats: {
      blockCount:     textBlocks.length,
      totalWordCount,
      topKeywords,
    },
    todoStats: {
      blockCount:     todoBlocks.length,
      totalItems,
      completedItems,
      completionRate,
    },
    calendarStats: {
      blockCount:     calendarBlocks.length,
      totalEvents,
      upcomingEvents,
      overdueEvents,
      nextEvent,
    },
    photoStats: {
      blockCount:  photoBlocks.length,
      totalPhotos,
      withCaption,
      withNotes,
      withDate,
      earliestDate,
      latestDate,
      byMonth,
    },
    blockComposition,
    upcomingEventsList,
    activityStats,
    overdueStats,
  });
});

export default router;
