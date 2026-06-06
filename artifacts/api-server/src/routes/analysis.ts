import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  instancesTable,
  blocksTable,
  todoItemsTable,
  calendarEventsTable,
  photosTable,
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

  const textBlocks = blocks.filter((b) => b.type === "richtext");
  const todoBlocks = blocks.filter((b) => b.type === "todo");
  const calendarBlocks = blocks.filter((b) => b.type === "calendar");
  const photoBlocks = blocks.filter((b) => b.type === "photo");

  // Text stats
  let totalWordCount = 0;
  const keywordFreq = new Map<string, number>();
  for (const b of textBlocks) {
    if (b.content) {
      totalWordCount += countWords(b.content);
      for (const [w, c] of extractKeywords(b.content)) {
        keywordFreq.set(w, (keywordFreq.get(w) ?? 0) + c);
      }
    }
  }
  const topKeywords = [...keywordFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));

  // Todo stats
  let totalItems = 0;
  let completedItems = 0;
  if (todoBlocks.length > 0) {
    const blockIds = todoBlocks.map((b) => b.id);
    for (const blockId of blockIds) {
      const items = await db
        .select()
        .from(todoItemsTable)
        .where(eq(todoItemsTable.blockId, blockId));
      totalItems += items.length;
      completedItems += items.filter((i) => i.completed).length;
    }
  }
  const completionRate = totalItems > 0 ? completedItems / totalItems : 0;

  // Calendar stats
  let totalEvents = 0;
  let upcomingEvents = 0;
  let overdueEvents = 0;
  let nextEvent = null;
  const today = new Date().toISOString().split("T")[0];
  if (calendarBlocks.length > 0) {
    const allEvents = [];
    for (const b of calendarBlocks) {
      const events = await db
        .select()
        .from(calendarEventsTable)
        .where(eq(calendarEventsTable.blockId, b.id));
      allEvents.push(...events);
    }
    totalEvents = allEvents.length;
    upcomingEvents = allEvents.filter((e) => e.date >= today).length;
    overdueEvents = allEvents.filter((e) => e.date < today).length;
    const upcoming = allEvents
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
    nextEvent = upcoming[0] ?? null;
  }

  // Photo stats
  let totalPhotos = 0;
  if (photoBlocks.length > 0) {
    for (const b of photoBlocks) {
      const photos = await db
        .select({ id: photosTable.id })
        .from(photosTable)
        .where(eq(photosTable.blockId, b.id));
      totalPhotos += photos.length;
    }
  }

  res.json({
    instanceId: id,
    totalBlocks: blocks.length,
    textStats: {
      blockCount: textBlocks.length,
      totalWordCount,
      topKeywords,
    },
    todoStats: {
      blockCount: todoBlocks.length,
      totalItems,
      completedItems,
      completionRate,
    },
    calendarStats: {
      blockCount: calendarBlocks.length,
      totalEvents,
      upcomingEvents,
      overdueEvents,
      nextEvent,
    },
    photoStats: {
      blockCount: photoBlocks.length,
      totalPhotos,
    },
  });
});

export default router;
