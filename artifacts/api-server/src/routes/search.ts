import { Router, type IRouter, type Request, type Response } from "express";
import { ilike, or, eq, sql, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  instancesTable, blocksTable,
  todoItemsTable, calendarEventsTable, photosTable,
  contactCardsTable, listItemsTable,
} from "@workspace/db";

const router: IRouter = Router();

router.get("/search", async (req: Request, res: Response) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (!q) {
    res.status(400).json({ error: "Missing or empty query parameter: q" });
    return;
  }
  const pattern = `%${q}%`;

  const [instanceResults, blockResults] = await Promise.all([
    db
      .select({
        instanceId: instancesTable.id,
        categoryId: instancesTable.categoryId,
        instanceName: instancesTable.name,
        instanceDescription: instancesTable.description,
      })
      .from(instancesTable)
      .where(
        or(
          ilike(instancesTable.name, pattern),
          ilike(instancesTable.description, pattern),
        ),
      )
      .limit(20),

    db
      .select({
        blockId: blocksTable.id,
        blockTitle: blocksTable.title,
        blockType: blocksTable.type,
        instanceId: instancesTable.id,
        categoryId: instancesTable.categoryId,
        instanceName: instancesTable.name,
      })
      .from(blocksTable)
      .innerJoin(instancesTable, eq(instancesTable.id, blocksTable.instanceId))
      .where(
        or(
          ilike(blocksTable.title, pattern),
          sql`${blocksTable.content}::text ilike ${pattern}`,
        ),
      )
      .limit(20),
  ]);

  const results = [
    ...instanceResults.map((r) => ({
      type: "instance" as const,
      instanceId: r.instanceId,
      categoryId: r.categoryId,
      instanceName: r.instanceName,
      snippet: r.instanceDescription ?? null,
      blockId: null,
      blockTitle: null,
      blockType: null,
    })),
    ...blockResults.map((r) => ({
      type: "block" as const,
      instanceId: r.instanceId,
      categoryId: r.categoryId,
      instanceName: r.instanceName,
      snippet: null,
      blockId: r.blockId,
      blockTitle: r.blockTitle ?? null,
      blockType: r.blockType,
    })),
  ];

  res.json(results);
});

/* ─── Instance-scoped search ─────────────────────────────────────────── */

interface InstanceSearchHit {
  blockId: number;
  blockType: string;
  blockTitle: string | null;
  matchType: string;
  snippet: string;
}

function makeSnippet(text: string, q: string, ctx = 45): string {
  if (!text) return "";
  const lc = text.toLowerCase();
  const qi = lc.indexOf(q.toLowerCase());
  if (qi === -1) return text.slice(0, ctx * 2);
  const start = Math.max(0, qi - ctx);
  const end   = Math.min(text.length, qi + q.length + ctx);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

router.get("/instances/:id/search", async (req: Request, res: Response) => {
  const instanceId = parseInt(req.params.id as string, 10);
  if (!instanceId) { res.status(400).json({ error: "Invalid id" }); return; }

  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 2) { res.json([]); return; }

  const pattern = `%${q}%`;

  const blocks = await db
    .select()
    .from(blocksTable)
    .where(eq(blocksTable.instanceId, instanceId));

  if (blocks.length === 0) { res.json([]); return; }

  const blockIds  = blocks.map((b) => b.id);
  const blockMap  = new Map(blocks.map((b) => [b.id, b]));
  const hits: InstanceSearchHit[] = [];

  // Helper: push a hit, avoiding duplicates on (blockId, matchType, snippet)
  const seen = new Set<string>();
  function push(blockId: number, matchType: string, snippet: string) {
    const key = `${blockId}|${matchType}|${snippet.slice(0, 40)}`;
    if (seen.has(key)) return;
    seen.add(key);
    const block = blockMap.get(blockId);
    if (!block) return;
    hits.push({ blockId, blockType: block.type, blockTitle: block.title ?? null, matchType, snippet });
  }

  // Block titles (all types)
  for (const b of blocks) {
    if (b.title && b.title.toLowerCase().includes(q.toLowerCase())) {
      push(b.id, "Block title", makeSnippet(b.title, q));
    }
  }

  // Richtext content (JS-side; stored as jsonb {html:"..."})
  for (const b of blocks.filter((b) => b.type === "richtext")) {
    const html = (b.content as { html?: string })?.html ?? "";
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text.toLowerCase().includes(q.toLowerCase())) {
      push(b.id, "Rich text", makeSnippet(text, q));
    }
  }

  // Parallel DB queries for child tables
  const todoBlockIds     = blocks.filter((b) => b.type === "todo").map((b) => b.id);
  const calendarBlockIds = blocks.filter((b) => b.type === "calendar").map((b) => b.id);
  const photoBlockIds    = blocks.filter((b) => b.type === "photo").map((b) => b.id);
  const contactBlockIds  = blocks.filter((b) => b.type === "contact").map((b) => b.id);
  const listBlockIds     = blocks.filter((b) => b.type === "list").map((b) => b.id);

  const [todoItems, calEvents, photos, contacts, listItems] = await Promise.all([
    todoBlockIds.length
      ? db.select({ id: todoItemsTable.id, blockId: todoItemsTable.blockId, text: todoItemsTable.text })
          .from(todoItemsTable)
          .where(inArray(todoItemsTable.blockId, todoBlockIds))
      : Promise.resolve([]),
    calendarBlockIds.length
      ? db.select({ id: calendarEventsTable.id, blockId: calendarEventsTable.blockId,
                    title: calendarEventsTable.title, description: calendarEventsTable.description })
          .from(calendarEventsTable)
          .where(inArray(calendarEventsTable.blockId, calendarBlockIds))
      : Promise.resolve([]),
    photoBlockIds.length
      ? db.select({ id: photosTable.id, blockId: photosTable.blockId,
                    caption: photosTable.caption, notes: photosTable.notes })
          .from(photosTable)
          .where(inArray(photosTable.blockId, photoBlockIds))
      : Promise.resolve([]),
    contactBlockIds.length
      ? db.select({ id: contactCardsTable.id, blockId: contactCardsTable.blockId,
                    firstName: contactCardsTable.firstName, lastName: contactCardsTable.lastName,
                    email: contactCardsTable.email, phone: contactCardsTable.phone,
                    description: contactCardsTable.description })
          .from(contactCardsTable)
          .where(inArray(contactCardsTable.blockId, contactBlockIds))
      : Promise.resolve([]),
    listBlockIds.length
      ? db.select({ id: listItemsTable.id, blockId: listItemsTable.blockId,
                    title: listItemsTable.title, description: listItemsTable.description,
                    notes: listItemsTable.notes })
          .from(listItemsTable)
          .where(inArray(listItemsTable.blockId, listBlockIds))
      : Promise.resolve([]),
  ]);

  // To-do items
  for (const item of todoItems) {
    if (item.text.toLowerCase().includes(q.toLowerCase()))
      push(item.blockId, "To-do item", makeSnippet(item.text, q));
  }

  // Calendar events
  for (const ev of calEvents) {
    if (ev.title.toLowerCase().includes(q.toLowerCase()))
      push(ev.blockId, "Event", makeSnippet(ev.title, q));
    if (ev.description && ev.description.toLowerCase().includes(q.toLowerCase()))
      push(ev.blockId, "Event note", makeSnippet(ev.description, q));
  }

  // Photos
  for (const p of photos) {
    if (p.caption && p.caption.toLowerCase().includes(q.toLowerCase()))
      push(p.blockId, "Photo caption", makeSnippet(p.caption, q));
    if (p.notes && p.notes.toLowerCase().includes(q.toLowerCase()))
      push(p.blockId, "Photo notes", makeSnippet(p.notes, q));
  }

  // Contact cards
  for (const c of contacts) {
    const fullName = `${c.firstName} ${c.lastName}`.trim();
    if (fullName.toLowerCase().includes(q.toLowerCase()))
      push(c.blockId, "Contact", makeSnippet(fullName, q));
    else {
      if (c.firstName.toLowerCase().includes(q.toLowerCase()))
        push(c.blockId, "Contact", makeSnippet(fullName, q));
      if (c.lastName.toLowerCase().includes(q.toLowerCase()))
        push(c.blockId, "Contact", makeSnippet(fullName, q));
    }
    if (c.email && c.email.toLowerCase().includes(q.toLowerCase()))
      push(c.blockId, "Contact email", makeSnippet(c.email, q));
    if (c.phone && c.phone.toLowerCase().includes(q.toLowerCase()))
      push(c.blockId, "Contact phone", makeSnippet(c.phone, q));
    if (c.description && c.description.toLowerCase().includes(q.toLowerCase()))
      push(c.blockId, "Contact note", makeSnippet(c.description, q));
  }

  // List items
  for (const item of listItems) {
    if (item.title.toLowerCase().includes(q.toLowerCase()))
      push(item.blockId, "List item", makeSnippet(item.title, q));
    if (item.description && item.description.toLowerCase().includes(q.toLowerCase()))
      push(item.blockId, "List item", makeSnippet(item.description, q));
    if (item.notes && item.notes.toLowerCase().includes(q.toLowerCase()))
      push(item.blockId, "List note", makeSnippet(item.notes, q));
  }

  // Sort: group by block (preserve block order), then by matchType
  const blockOrder = new Map(blocks.map((b, i) => [b.id, i]));
  hits.sort((a, b) => (blockOrder.get(a.blockId) ?? 0) - (blockOrder.get(b.blockId) ?? 0));

  res.json(hits.slice(0, 40));
});

export default router;
