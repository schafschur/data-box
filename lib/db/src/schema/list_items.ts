import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { blocksTable } from "./blocks";

export const listItemsTable = pgTable("list_items", {
  id: serial("id").primaryKey(),
  blockId: integer("block_id").notNull().references(() => blocksTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertListItemSchema = createInsertSchema(listItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertListItem = z.infer<typeof insertListItemSchema>;
export type ListItemRow = typeof listItemsTable.$inferSelect;
