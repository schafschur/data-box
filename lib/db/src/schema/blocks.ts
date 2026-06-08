import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { instancesTable } from "./instances";

export const BLOCK_TYPES = ["richtext", "todo", "calendar", "photo", "pdf"] as const;
export type BlockType = typeof BLOCK_TYPES[number];

export const blocksTable = pgTable("blocks", {
  id: serial("id").primaryKey(),
  instanceId: integer("instance_id").notNull().references(() => instancesTable.id, { onDelete: "cascade" }),
  type: text("type").notNull().$type<BlockType>(),
  title: text("title"),
  position: integer("position").notNull().default(0),
  importance: integer("importance"),
  content: jsonb("content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBlockSchema = createInsertSchema(blocksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBlock = z.infer<typeof insertBlockSchema>;
export type Block = typeof blocksTable.$inferSelect;
