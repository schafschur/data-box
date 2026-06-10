import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const locationsTable = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Location = typeof locationsTable.$inferSelect;
export type InsertLocation = typeof locationsTable.$inferInsert;
