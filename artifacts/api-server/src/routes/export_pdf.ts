import { Router, type IRouter, type Request, type Response } from "express";
import PDFDocument from "pdfkit";
import { eq, asc, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  blocksTable,
  instancesTable,
  categoriesTable,
  todoItemsTable,
  calendarEventsTable,
  photosTable,
  contactCardsTable,
  listItemsTable,
} from "@workspace/db";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorage = new ObjectStorageService();

/* ── Helpers ─────────────────────────────────────────────────── */

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "export"
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

type BlockRow = typeof blocksTable.$inferSelect;

interface BlockData {
  block: BlockRow;
  todoItems?: (typeof todoItemsTable.$inferSelect)[];
  calendarEvents?: (typeof calendarEventsTable.$inferSelect)[];
  photos?: (typeof photosTable.$inferSelect)[];
  contacts?: (typeof contactCardsTable.$inferSelect)[];
  listItems?: (typeof listItemsTable.$inferSelect)[];
}

async function fetchBlockData(block: BlockRow): Promise<BlockData> {
  const data: BlockData = { block };
  const id = block.id;

  if (block.type === "todo") {
    data.todoItems = await db
      .select()
      .from(todoItemsTable)
      .where(eq(todoItemsTable.blockId, id))
      .orderBy(asc(todoItemsTable.position), asc(todoItemsTable.createdAt));
  } else if (block.type === "calendar") {
    data.calendarEvents = await db
      .select()
      .from(calendarEventsTable)
      .where(eq(calendarEventsTable.blockId, id))
      .orderBy(asc(calendarEventsTable.date));
  } else if (block.type === "photo") {
    data.photos = await db
      .select()
      .from(photosTable)
      .where(eq(photosTable.blockId, id))
      .orderBy(asc(photosTable.createdAt));
  } else if (block.type === "contact") {
    data.contacts = await db
      .select()
      .from(contactCardsTable)
      .where(eq(contactCardsTable.blockId, id))
      .orderBy(asc(contactCardsTable.sortOrder), asc(contactCardsTable.id));
  } else if (block.type === "list") {
    data.listItems = await db
      .select()
      .from(listItemsTable)
      .where(eq(listItemsTable.blockId, id))
      .orderBy(asc(listItemsTable.sortOrder), asc(listItemsTable.id));
  }

  return data;
}

async function fetchImageBuffer(objectPath: string): Promise<Buffer | null> {
  try {
    const file = await objectStorage.getObjectEntityFile(objectPath);
    const [buffer] = await file.download();
    return buffer as Buffer;
  } catch {
    return null;
  }
}

/* ── PDF rendering ───────────────────────────────────────────── */

const MARGIN = 56;
const PAGE_WIDTH = 595.28;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function addSectionTitle(doc: PDFKit.PDFDocument, text: string) {
  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor("#111111")
    .text(text, MARGIN, doc.y, { width: CONTENT_WIDTH });
  doc.moveDown(0.4);
  doc
    .moveTo(MARGIN, doc.y)
    .lineTo(PAGE_WIDTH - MARGIN, doc.y)
    .strokeColor("#e5e7eb")
    .lineWidth(0.5)
    .stroke();
  doc.moveDown(0.6);
}

function addBlockHeader(doc: PDFKit.PDFDocument, data: BlockData) {
  const title =
    data.block.title ||
    `Untitled ${data.block.type === "pdf" ? "PDF" : data.block.type}`;
  const typeLabel = data.block.type.charAt(0).toUpperCase() + data.block.type.slice(1);

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor("#1f2937")
    .text(title, MARGIN, doc.y, { width: CONTENT_WIDTH - 60 });

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#9ca3af")
    .text(typeLabel, { align: "right" });

  doc.moveDown(0.5);
}

async function renderBlockContent(
  doc: PDFKit.PDFDocument,
  data: BlockData
): Promise<void> {
  const { block } = data;

  if (block.type === "richtext") {
    const content = block.content as { html?: string } | null;
    if (content?.html) {
      const text = stripHtml(content.html);
      if (text) {
        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor("#374151")
          .text(text, MARGIN, doc.y, { width: CONTENT_WIDTH, lineGap: 3 });
      }
    } else {
      doc.font("Helvetica").fontSize(10).fillColor("#9ca3af").text("(empty)", MARGIN, doc.y);
    }
  } else if (block.type === "todo") {
    const items = data.todoItems || [];
    if (items.length === 0) {
      doc.font("Helvetica").fontSize(10).fillColor("#9ca3af").text("(no items)", MARGIN, doc.y);
    } else {
      for (const item of items) {
        const check = item.completed ? "☑" : "☐";
        const color = item.completed ? "#9ca3af" : "#1f2937";
        let line = `${check}  ${item.text}`;
        if (item.deadline) line += `   (due ${item.deadline})`;
        doc
          .font(item.completed ? "Helvetica" : "Helvetica")
          .fontSize(10)
          .fillColor(color)
          .text(line, MARGIN + 4, doc.y, { width: CONTENT_WIDTH - 4, lineGap: 2 });
        doc.moveDown(0.15);
      }
    }
  } else if (block.type === "calendar") {
    const events = data.calendarEvents || [];
    if (events.length === 0) {
      doc.font("Helvetica").fontSize(10).fillColor("#9ca3af").text("(no events)", MARGIN, doc.y);
    } else {
      for (const ev of events) {
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#1f2937").text(ev.title, MARGIN + 4, doc.y, { width: CONTENT_WIDTH - 4 });
        let dateLine = ev.date;
        if (ev.endDate && ev.endDate !== ev.date) dateLine += ` – ${ev.endDate}`;
        if (ev.startTime) {
          dateLine += `  ${ev.startTime}`;
          if (ev.endTime) dateLine += ` – ${ev.endTime}`;
        }
        doc.font("Helvetica").fontSize(9).fillColor("#6b7280").text(dateLine, MARGIN + 4, doc.y, { width: CONTENT_WIDTH - 4 });
        if (ev.description) {
          doc.font("Helvetica").fontSize(9).fillColor("#374151").text(ev.description, MARGIN + 4, doc.y, { width: CONTENT_WIDTH - 4 });
        }
        doc.moveDown(0.4);
      }
    }
  } else if (block.type === "contact") {
    const cards = data.contacts || [];
    if (cards.length === 0) {
      doc.font("Helvetica").fontSize(10).fillColor("#9ca3af").text("(no contacts)", MARGIN, doc.y);
    } else {
      for (const card of cards) {
        const name = [card.firstName, card.lastName].filter(Boolean).join(" ");
        doc.font("Helvetica-Bold").fontSize(11).fillColor("#1f2937").text(name, MARGIN + 4, doc.y, { width: CONTENT_WIDTH - 4 });
        if (card.description) {
          doc.font("Helvetica").fontSize(9).fillColor("#6b7280").text(card.description, MARGIN + 4, doc.y, { width: CONTENT_WIDTH - 4 });
        }
        if (card.email) {
          doc.font("Helvetica").fontSize(9).fillColor("#374151").text(`✉  ${card.email}`, MARGIN + 4, doc.y, { width: CONTENT_WIDTH - 4 });
        }
        if (card.phone) {
          doc.font("Helvetica").fontSize(9).fillColor("#374151").text(`✆  ${card.phone}`, MARGIN + 4, doc.y, { width: CONTENT_WIDTH - 4 });
        }
        doc.moveDown(0.5);
      }
    }
  } else if (block.type === "list") {
    const items = data.listItems || [];
    if (items.length === 0) {
      doc.font("Helvetica").fontSize(10).fillColor("#9ca3af").text("(no items)", MARGIN, doc.y);
    } else {
      for (const item of items) {
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#1f2937").text(`• ${item.title}`, MARGIN + 4, doc.y, { width: CONTENT_WIDTH - 4 });
        if (item.description) {
          doc.font("Helvetica").fontSize(9).fillColor("#6b7280").text(item.description, MARGIN + 12, doc.y, { width: CONTENT_WIDTH - 12 });
        }
        if (item.notes) {
          doc.font("Helvetica").fontSize(9).fillColor("#9ca3af").text(item.notes, MARGIN + 12, doc.y, { width: CONTENT_WIDTH - 12 });
        }
        doc.moveDown(0.25);
      }
    }
  } else if (block.type === "photo") {
    const photos = data.photos || [];
    if (photos.length === 0) {
      doc.font("Helvetica").fontSize(10).fillColor("#9ca3af").text("(no photos)", MARGIN, doc.y);
    } else {
      for (const photo of photos) {
        const imgBuffer = await fetchImageBuffer(photo.objectPath);
        if (imgBuffer) {
          const maxW = CONTENT_WIDTH;
          const maxH = 200;
          try {
            doc.image(imgBuffer, MARGIN, doc.y, { fit: [maxW, maxH], align: "left" });
            doc.moveDown(0.3);
          } catch {
            doc.font("Helvetica").fontSize(9).fillColor("#9ca3af").text("[image could not be embedded]", MARGIN, doc.y);
          }
        } else {
          doc.font("Helvetica").fontSize(9).fillColor("#9ca3af").text("[photo not available]", MARGIN, doc.y);
        }
        if (photo.caption) {
          doc.font("Helvetica").fontSize(9).fillColor("#6b7280").text(photo.caption, MARGIN, doc.y, { width: CONTENT_WIDTH, align: "center" });
        }
        if (photo.notes) {
          doc.font("Helvetica").fontSize(9).fillColor("#9ca3af").text(photo.notes, MARGIN, doc.y, { width: CONTENT_WIDTH });
        }
        doc.moveDown(0.5);
      }
    }
  } else if (block.type === "pdf") {
    const content = block.content as { pdfs?: { filename?: string; size?: number; uploadedAt?: string }[] } | null;
    const pdfs = content?.pdfs || [];
    if (pdfs.length === 0) {
      doc.font("Helvetica").fontSize(10).fillColor("#9ca3af").text("(no PDFs attached)", MARGIN, doc.y);
    } else {
      for (const pdf of pdfs) {
        const name = pdf.filename || "Untitled PDF";
        const size = pdf.size ? ` (${(pdf.size / 1024).toFixed(1)} KB)` : "";
        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor("#374151")
          .text(`📄 ${name}${size}`, MARGIN + 4, doc.y, { width: CONTENT_WIDTH - 4 });
        doc.moveDown(0.2);
      }
    }
  }
}

async function renderFullBlock(doc: PDFKit.PDFDocument, data: BlockData): Promise<void> {
  addBlockHeader(doc, data);
  await renderBlockContent(doc, data);
}

function addCoverPage(
  doc: PDFKit.PDFDocument,
  title: string,
  subtitle?: string,
  description?: string
) {
  doc.font("Helvetica-Bold").fontSize(28).fillColor("#111111").text(title, MARGIN, 140, { width: CONTENT_WIDTH });
  if (subtitle) {
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(14).fillColor("#6b7280").text(subtitle, MARGIN, doc.y, { width: CONTENT_WIDTH });
  }
  if (description) {
    doc.moveDown(0.8);
    doc.font("Helvetica").fontSize(11).fillColor("#374151").text(description, MARGIN, doc.y, { width: CONTENT_WIDTH });
  }
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  doc.font("Helvetica").fontSize(9).fillColor("#9ca3af").text(`Exported ${date}`, MARGIN, doc.page.height - 72, { width: CONTENT_WIDTH });
}

function streamPdf(res: Response, doc: PDFKit.PDFDocument, filename: string) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  doc.pipe(res);
}

/* ── Block export ────────────────────────────────────────────── */
router.get("/blocks/:blockId/export/pdf", async (req: Request, res: Response) => {
  try {
    const blockId = parseInt(req.params.blockId, 10);
    if (isNaN(blockId)) { res.status(400).json({ error: "Invalid blockId" }); return; }

    const [block] = await db.select().from(blocksTable).where(eq(blocksTable.id, blockId));
    if (!block) { res.status(404).json({ error: "Block not found" }); return; }

    const data = await fetchBlockData(block);
    const title = block.title || `${block.type}-block`;

    const doc = new PDFDocument({ margin: MARGIN, size: "A4" });
    streamPdf(res, doc, `${slugify(title)}-export.pdf`);

    addCoverPage(doc, title);
    doc.addPage();

    addBlockHeader(doc, data);
    await renderBlockContent(doc, data);

    doc.end();
  } catch (err) {
    console.error("Block PDF export error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate PDF" });
  }
});

/* ── Instance export ─────────────────────────────────────────── */
router.get("/instances/:instanceId/export/pdf", async (req: Request, res: Response) => {
  try {
    const instanceId = parseInt(req.params.instanceId, 10);
    if (isNaN(instanceId)) { res.status(400).json({ error: "Invalid instanceId" }); return; }

    const [instance] = await db.select().from(instancesTable).where(eq(instancesTable.id, instanceId));
    if (!instance) { res.status(404).json({ error: "Instance not found" }); return; }

    const blocks = await db
      .select()
      .from(blocksTable)
      .where(eq(blocksTable.instanceId, instanceId))
      .orderBy(asc(blocksTable.position));

    const blockDataList = await Promise.all(blocks.map(fetchBlockData));

    const doc = new PDFDocument({ margin: MARGIN, size: "A4" });
    streamPdf(res, doc, `${slugify(instance.name)}-export.pdf`);

    addCoverPage(doc, instance.name, undefined, instance.description || undefined);

    if (blockDataList.length > 0) {
      doc.addPage();
      for (let i = 0; i < blockDataList.length; i++) {
        if (i > 0) doc.moveDown(1.5);
        await renderFullBlock(doc, blockDataList[i]);
      }
    }

    doc.end();
  } catch (err) {
    console.error("Instance PDF export error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate PDF" });
  }
});

/* ── Category export ─────────────────────────────────────────── */
router.get("/categories/:categoryId/export/pdf", async (req: Request, res: Response) => {
  try {
    const categoryId = parseInt(req.params.categoryId, 10);
    if (isNaN(categoryId)) { res.status(400).json({ error: "Invalid categoryId" }); return; }

    const [category] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, categoryId));
    if (!category) { res.status(404).json({ error: "Category not found" }); return; }

    const instances = await db
      .select()
      .from(instancesTable)
      .where(eq(instancesTable.categoryId, categoryId))
      .orderBy(asc(instancesTable.id));

    const instanceIds = instances.map((i) => i.id);

    let allBlocks: (typeof blocksTable.$inferSelect)[] = [];
    if (instanceIds.length > 0) {
      allBlocks = await db
        .select()
        .from(blocksTable)
        .where(inArray(blocksTable.instanceId, instanceIds))
        .orderBy(asc(blocksTable.instanceId), asc(blocksTable.position));
    }

    const blocksByInstance = new Map<number, (typeof blocksTable.$inferSelect)[]>();
    for (const b of allBlocks) {
      if (!blocksByInstance.has(b.instanceId)) blocksByInstance.set(b.instanceId, []);
      blocksByInstance.get(b.instanceId)!.push(b);
    }

    const doc = new PDFDocument({ margin: MARGIN, size: "A4" });
    streamPdf(res, doc, `${slugify(category.name)}-export.pdf`);

    addCoverPage(doc, category.name, "Category Export", category.description || undefined);

    for (const instance of instances) {
      doc.addPage();
      addSectionTitle(doc, instance.name);
      if (instance.description) {
        doc.font("Helvetica").fontSize(10).fillColor("#6b7280").text(instance.description, MARGIN, doc.y, { width: CONTENT_WIDTH });
        doc.moveDown(0.8);
      }

      const blocks = blocksByInstance.get(instance.id) || [];
      if (blocks.length === 0) {
        doc.font("Helvetica").fontSize(10).fillColor("#9ca3af").text("(no blocks)", MARGIN, doc.y);
      } else {
        const blockDataList = await Promise.all(blocks.map(fetchBlockData));
        for (let i = 0; i < blockDataList.length; i++) {
          if (i > 0) doc.moveDown(1.2);
          await renderFullBlock(doc, blockDataList[i]);
        }
      }
    }

    doc.end();
  } catch (err) {
    console.error("Category PDF export error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate PDF" });
  }
});

export default router;
