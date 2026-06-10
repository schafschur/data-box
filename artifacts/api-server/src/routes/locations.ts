import { Router, type IRouter, type Request, type Response } from "express";
import { eq, asc } from "drizzle-orm";
import { db, locationsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/locations", async (_req: Request, res: Response) => {
  const rows = await db
    .select()
    .from(locationsTable)
    .orderBy(asc(locationsTable.name));
  res.json(rows);
});

router.post("/locations", async (req: Request, res: Response) => {
  const { name, color } = req.body as { name?: string; color?: string };
  if (!name?.trim() || !color?.trim()) {
    res.status(400).json({ error: "name and color are required" });
    return;
  }
  const [row] = await db
    .insert(locationsTable)
    .values({ name: name.trim(), color: color.trim() })
    .returning();
  res.status(201).json(row);
});

router.put("/locations/:id", async (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { name, color } = req.body as { name?: string; color?: string };
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updates["name"] = name.trim();
  if (color !== undefined) updates["color"] = color.trim();
  const [row] = await db
    .update(locationsTable)
    .set(updates)
    .where(eq(locationsTable.id, id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Location not found" });
    return;
  }
  res.json(row);
});

router.delete("/locations/:id", async (req: Request, res: Response) => {
  const id = Number(req.params["id"]);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(locationsTable).where(eq(locationsTable.id, id));
  res.status(204).end();
});

export default router;
