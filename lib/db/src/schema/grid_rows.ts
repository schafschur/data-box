import { pgTable, serial, text, integer, timestamp, numeric, date } from "drizzle-orm/pg-core";
import { blocksTable } from "./blocks";

export const gridRowsTable = pgTable("grid_rows", {
  id: serial("id").primaryKey(),
  blockId: integer("block_id").notNull().references(() => blocksTable.id, { onDelete: "cascade" }),
  label: text("label"),
  position: integer("position").notNull().default(0),
  weekOf: date("week_of"),
  mon: numeric("mon"),
  tue: numeric("tue"),
  wed: numeric("wed"),
  thu: numeric("thu"),
  fri: numeric("fri"),
  sat: numeric("sat"),
  sun: numeric("sun"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type GridRow = typeof gridRowsTable.$inferSelect;
export type InsertGridRow = typeof gridRowsTable.$inferInsert;
