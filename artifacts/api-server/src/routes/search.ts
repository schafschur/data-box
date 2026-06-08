import { Router, type IRouter, type Request, type Response } from "express";
import { ilike, or, eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { instancesTable, blocksTable } from "@workspace/db";

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

export default router;
