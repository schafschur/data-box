import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { blocksTable } from "./blocks";

export const photosTable = pgTable("photos", {
  id: serial("id").primaryKey(),
  blockId: integer("block_id").notNull().references(() => blocksTable.id, { onDelete: "cascade" }),
  objectPath: text("object_path").notNull(),
  caption: text("caption"),
  notes: text("notes"),
  displayDate: text("display_date"),
  photoCategory: text("photo_category"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPhotoSchema = createInsertSchema(photosTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type Photo = typeof photosTable.$inferSelect;
