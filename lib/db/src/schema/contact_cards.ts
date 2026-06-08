import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { blocksTable } from "./blocks";

export const contactCardsTable = pgTable("contact_cards", {
  id: serial("id").primaryKey(),
  blockId: integer("block_id").notNull().references(() => blocksTable.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  description: text("description"),
  email: text("email"),
  phone: text("phone"),
  photoPath: text("photo_path"),
  color: text("color").notNull().default("#4f46e5"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertContactCardSchema = createInsertSchema(contactCardsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContactCard = z.infer<typeof insertContactCardSchema>;
export type ContactCardRow = typeof contactCardsTable.$inferSelect;
