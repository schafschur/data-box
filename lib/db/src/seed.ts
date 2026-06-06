import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import {
  categoriesTable,
  instancesTable,
  blocksTable,
  todoItemsTable,
  calendarEventsTable,
} from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function seed() {
  console.log("Seeding database…");

  // Clear existing data (cascade handles dependent tables)
  await db.delete(categoriesTable);
  console.log("Cleared existing data");

  // ── Categories ───────────────────────────────────────────────────────────
  const [personal, reading, work] = await db
    .insert(categoriesTable)
    .values([
      { name: "Personal Projects", description: "Side projects and personal experiments", color: "#6366f1" },
      { name: "Reading Notes", description: "Book summaries and reading insights", color: "#22c55e" },
      { name: "Work", description: "Work projects and meeting notes", color: "#f59e0b" },
    ])
    .returning();

  console.log("Created categories:", [personal.name, reading.name, work.name]);

  // ── Instances ────────────────────────────────────────────────────────────
  const [databoxInst, homeAuto, atomicHabits, workQ2] = await db
    .insert(instancesTable)
    .values([
      { categoryId: personal.id, name: "Databox App", description: "Building a personal data workspace app" },
      { categoryId: personal.id, name: "Home Automation", description: "Smart home setup notes and tasks" },
      { categoryId: reading.id, name: "Atomic Habits", description: "Notes on Atomic Habits by James Clear" },
      { categoryId: work.id, name: "Q2 Planning", description: "Q2 goals, milestones, and meeting notes" },
    ])
    .returning();

  console.log("Created instances");

  // ── Blocks for Databox App ───────────────────────────────────────────────
  const [overviewBlock, mvpBlock, milestonesBlock] = await db
    .insert(blocksTable)
    .values([
      {
        instanceId: databoxInst.id,
        type: "richtext",
        title: "Project Overview",
        position: 0,
        content: {
          html: "<h2>Databox — Personal Data Workspace</h2><p>A desktop-first app for organizing personal data into <strong>Categories → Instances → Blocks</strong>. Each block is a different content type: rich text, todos, calendar, or photos.</p><p>The goal is a single place to capture and analyze everything you care about.</p>",
        },
      },
      {
        instanceId: databoxInst.id,
        type: "todo",
        title: "MVP Checklist",
        position: 1,
        content: null,
      },
      {
        instanceId: databoxInst.id,
        type: "calendar",
        title: "Milestones",
        position: 2,
        content: null,
      },
    ])
    .returning();

  // Todo items for MVP Checklist
  await db.insert(todoItemsTable).values([
    { blockId: mvpBlock.id, text: "Design subagent brief", completed: false, position: 0 },
    { blockId: mvpBlock.id, text: "Build backend routes", completed: true, position: 1 },
    { blockId: mvpBlock.id, text: "Run DB migrations", completed: true, position: 2 },
    { blockId: mvpBlock.id, text: "Wire frontend with real hooks", completed: false, position: 3 },
    { blockId: mvpBlock.id, text: "Add photo upload flow", completed: false, position: 4 },
  ]);

  // Calendar events for Milestones
  const today = new Date();
  const addDays = (d: Date, n: number) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r.toISOString().split("T")[0];
  };

  await db.insert(calendarEventsTable).values([
    { blockId: milestonesBlock.id, title: "Design Review", date: addDays(today, 2) },
    { blockId: milestonesBlock.id, title: "Beta Launch", date: addDays(today, 14) },
    { blockId: milestonesBlock.id, title: "User Testing", date: addDays(today, 25) },
  ]);

  console.log("Created Databox App blocks, todos, and calendar events");

  // ── Blocks for Atomic Habits ─────────────────────────────────────────────
  const [habitsNotes, habitsActions] = await db
    .insert(blocksTable)
    .values([
      {
        instanceId: atomicHabits.id,
        type: "richtext",
        title: "Key Concepts",
        position: 0,
        content: {
          html: "<h2>Atomic Habits — Key Takeaways</h2><p><strong>The 1% Rule:</strong> Small improvements compound dramatically over time. Getting 1% better every day for a year makes you 37x better.</p><p><strong>Four Laws of Behavior Change:</strong></p><ul><li>Make it obvious</li><li>Make it attractive</li><li>Make it easy</li><li>Make it satisfying</li></ul>",
        },
      },
      {
        instanceId: atomicHabits.id,
        type: "todo",
        title: "Habits to Build",
        position: 1,
        content: null,
      },
    ])
    .returning();

  await db.insert(todoItemsTable).values([
    { blockId: habitsActions.id, text: "Read 10 pages daily before bed", completed: true, position: 0 },
    { blockId: habitsActions.id, text: "Morning journaling routine", completed: false, position: 1 },
    { blockId: habitsActions.id, text: "Weekly review every Sunday", completed: false, position: 2 },
  ]);

  console.log("Created Atomic Habits blocks");

  // ── Blocks for Q2 Planning ────────────────────────────────────────────────
  const [q2Goals, q2Meetings] = await db
    .insert(blocksTable)
    .values([
      {
        instanceId: workQ2.id,
        type: "richtext",
        title: "Q2 Goals",
        position: 0,
        content: {
          html: "<h2>Q2 Objectives</h2><p>Focus areas for Q2:</p><ul><li><strong>Ship v2.0</strong> — complete redesign and performance improvements</li><li><strong>Grow user base</strong> — target 20% MoM growth</li><li><strong>Reduce churn</strong> — improve onboarding flow</li></ul>",
        },
      },
      {
        instanceId: workQ2.id,
        type: "calendar",
        title: "Key Meetings",
        position: 1,
        content: null,
      },
    ])
    .returning();

  await db.insert(calendarEventsTable).values([
    { blockId: q2Meetings.id, title: "All Hands Meeting", date: addDays(today, 3) },
    { blockId: q2Meetings.id, title: "Product Review", date: addDays(today, 7) },
    { blockId: q2Meetings.id, title: "Quarterly Planning", date: addDays(today, 30) },
  ]);

  console.log("Created Q2 Planning blocks");
  console.log("\n✅ Seed complete!");
  await pool.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
