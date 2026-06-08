import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  Panel,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CheckSquare, FileText, Calendar, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/* ─── Types ─────────────────────────────────────────────────────────── */
interface BlockData {
  id: number;
  type: string;
  title: string | null;
  content: unknown;
  importance?: number | null;
}

function importanceBgColor(imp: number | null | undefined): string | undefined {
  if (!imp) return undefined;
  if (imp <= 2) return "#f8fafc";
  if (imp <= 4) return "#eff6ff";
  if (imp <= 6) return "#f0fdfa";
  if (imp <= 8) return "#fffbeb";
  return "#fff7ed";
}
interface TodoItem {
  id: number;
  blockId: number;
  text: string;
  completed: boolean;
  position: number;
}
interface CalendarEvent {
  id: number;
  blockId: number;
  title: string;
  date: string;
  description: string | null;
}
interface MapData {
  blocks: BlockData[];
  todoItems: TodoItem[];
  calendarEvents: CalendarEvent[];
}
interface MapLayout {
  nodePositions: Record<string, { x: number; y: number }>;
  customEdges: Array<{ id: string; source: string; target: string }>;
}

/* ─── Handle style helper ────────────────────────────────────────────── */
function handleStyle(accent: string): React.CSSProperties {
  return {
    width: 7,
    height: 7,
    background: accent,
    border: "1.5px solid white",
    boxShadow: "0 0 0 1px " + accent,
    borderRadius: "50%",
    cursor: "crosshair",
  };
}

/* ─── Custom node card ───────────────────────────────────────────────── */
function NodeCard({
  icon,
  title,
  children,
  accent,
  bg,
}: {
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  accent: string;
  bg?: string;
}) {
  return (
    <>
      <Handle id="top"    type="target" position={Position.Top}    style={handleStyle(accent)} />
      <Handle id="left"   type="target" position={Position.Left}   style={handleStyle(accent)} />
      <div
        className="rounded-xl shadow-md border border-card-border text-card-foreground min-w-[180px] max-w-[260px] overflow-hidden"
        style={{ borderTopColor: accent, borderTopWidth: 3, backgroundColor: bg ?? "var(--card)" }}
      >
        <div className="flex items-center gap-2 px-3 py-2 border-b border-card-border bg-muted/40">
          <span style={{ color: accent }}>{icon}</span>
          <span className="text-xs font-semibold truncate">{title || "Untitled"}</span>
        </div>
        {children && (
          <div className="px-3 py-2 text-xs text-muted-foreground space-y-0.5">
            {children}
          </div>
        )}
      </div>
      <Handle id="bottom" type="source" position={Position.Bottom} style={handleStyle(accent)} />
      <Handle id="right"  type="source" position={Position.Right}  style={handleStyle(accent)} />
    </>
  );
}

/* ─── Node type renderers ────────────────────────────────────────────── */
function RichtextNode({ data }: { data: { title: string; preview: string; importance?: number | null } }) {
  return (
    <NodeCard icon={<FileText className="w-3.5 h-3.5" />} title={data.title} accent="hsl(176 43% 52%)" bg={importanceBgColor(data.importance)}>
      {data.preview && (
        <p className="line-clamp-3 leading-relaxed">{data.preview}</p>
      )}
    </NodeCard>
  );
}

function TodoBlockNode({ data }: { data: { title: string; count: number; done: number; importance?: number | null } }) {
  const pct = data.count > 0 ? Math.round((data.done / data.count) * 100) : 0;
  const accent = "hsl(16 75% 61%)";
  return (
    <NodeCard icon={<CheckSquare className="w-3.5 h-3.5" />} title={data.title} accent={accent} bg={importanceBgColor(data.importance)}>
      <div className="flex items-center justify-between mb-1">
        <span>{data.done}/{data.count} done</span>
        <span className="font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: accent }} />
      </div>
    </NodeCard>
  );
}

function TodoItemNode({ data }: { data: { text: string; completed: boolean } }) {
  const accent = "hsl(16 75% 61%)";
  return (
    <>
      <Handle id="top"    type="target" position={Position.Top}    style={handleStyle(accent)} />
      <Handle id="left"   type="target" position={Position.Left}   style={handleStyle(accent)} />
      <div className="rounded-lg shadow-md bg-card border border-card-border px-3 py-2 flex items-center gap-2 text-xs max-w-[220px]"
        style={{ borderLeftColor: accent, borderLeftWidth: 3 }}>
        <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${data.completed ? "border-[hsl(16_75%_61%)]" : "border-border"}`}
          style={data.completed ? { background: accent } : {}}>
          {data.completed && <span className="text-white text-[8px]">✓</span>}
        </span>
        <span className={`truncate ${data.completed ? "line-through text-muted-foreground" : ""}`}>{data.text}</span>
      </div>
      <Handle id="bottom" type="source" position={Position.Bottom} style={handleStyle(accent)} />
      <Handle id="right"  type="source" position={Position.Right}  style={handleStyle(accent)} />
    </>
  );
}

function CalendarBlockNode({ data }: { data: { title: string; count: number; importance?: number | null } }) {
  return (
    <NodeCard icon={<Calendar className="w-3.5 h-3.5" />} title={data.title} accent="hsl(346 58% 57%)" bg={importanceBgColor(data.importance)}>
      <span>{data.count} event{data.count !== 1 ? "s" : ""}</span>
    </NodeCard>
  );
}

function CalendarEventNode({ data }: { data: { title: string; date: string } }) {
  const accent = "hsl(346 58% 57%)";
  return (
    <>
      <Handle id="top"    type="target" position={Position.Top}    style={handleStyle(accent)} />
      <Handle id="left"   type="target" position={Position.Left}   style={handleStyle(accent)} />
      <div className="rounded-lg shadow-md bg-card border border-card-border px-3 py-2 text-xs max-w-[220px]"
        style={{ borderLeftColor: accent, borderLeftWidth: 3 }}>
        <div className="font-medium truncate">{data.title}</div>
        <div className="text-muted-foreground">{data.date}</div>
      </div>
      <Handle id="bottom" type="source" position={Position.Bottom} style={handleStyle(accent)} />
      <Handle id="right"  type="source" position={Position.Right}  style={handleStyle(accent)} />
    </>
  );
}

const nodeTypes = {
  richtext: RichtextNode,
  todoBlock: TodoBlockNode,
  todoItem: TodoItemNode,
  calendarBlock: CalendarBlockNode,
  calendarEvent: CalendarEventNode,
};

/* ─── Layout helper ──────────────────────────────────────────────────── */
function buildInitialLayout(
  mapData: MapData,
  savedPositions: Record<string, { x: number; y: number }>
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let col = 0;

  for (const block of mapData.blocks) {
    const blockNodeId = `block-${block.id}`;
    const savedPos = savedPositions[blockNodeId];
    const baseX = savedPos?.x ?? col * 320 + 40;
    const baseY = savedPos?.y ?? 60;

    if (block.type === "richtext") {
      const html = (block.content as { html?: string })?.html ?? "";
      const preview = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
      nodes.push({
        id: blockNodeId,
        type: "richtext",
        position: { x: baseX, y: baseY },
        data: { title: block.title ?? "Note", preview, importance: block.importance },
      });
      col++;
    } else if (block.type === "todo") {
      const items = mapData.todoItems.filter((t) => t.blockId === block.id).sort((a, b) => a.position - b.position);
      nodes.push({
        id: blockNodeId,
        type: "todoBlock",
        position: { x: baseX, y: baseY },
        data: { title: block.title ?? "Checklist", count: items.length, done: items.filter((i) => i.completed).length, importance: block.importance },
      });
      items.forEach((item, idx) => {
        const itemId = `todo-${item.id}`;
        const itemPos = savedPositions[itemId];
        nodes.push({
          id: itemId,
          type: "todoItem",
          position: { x: itemPos?.x ?? baseX + 20, y: itemPos?.y ?? baseY + 80 + idx * 42 },
          data: { text: item.text, completed: item.completed },
        });
        edges.push({
          id: `e-${blockNodeId}-${itemId}`,
          source: blockNodeId,
          target: itemId,
          sourceHandle: "bottom",
          targetHandle: "top",
          style: { stroke: "hsl(16 75% 61%)", strokeWidth: 1.5, strokeDasharray: "4 3" },
          animated: false,
        });
      });
      col++;
    } else if (block.type === "calendar") {
      const events = mapData.calendarEvents.filter((e) => e.blockId === block.id).sort((a, b) => a.date.localeCompare(b.date));
      nodes.push({
        id: blockNodeId,
        type: "calendarBlock",
        position: { x: baseX, y: baseY },
        data: { title: block.title ?? "Timeline", count: events.length, importance: block.importance },
      });
      events.forEach((ev, idx) => {
        const evId = `event-${ev.id}`;
        const evPos = savedPositions[evId];
        nodes.push({
          id: evId,
          type: "calendarEvent",
          position: { x: evPos?.x ?? baseX + 20, y: evPos?.y ?? baseY + 80 + idx * 52 },
          data: { title: ev.title, date: ev.date },
        });
        edges.push({
          id: `e-${blockNodeId}-${evId}`,
          source: blockNodeId,
          target: evId,
          sourceHandle: "bottom",
          targetHandle: "top",
          style: { stroke: "hsl(346 58% 57%)", strokeWidth: 1.5, strokeDasharray: "4 3" },
          animated: false,
        });
      });
      col++;
    }
  }

  return { nodes, edges };
}

/* ─── Main component ─────────────────────────────────────────────────── */
interface MapViewProps {
  instanceId: number;
}

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchMapData(id: number): Promise<MapData> {
  const r = await fetch(`${API_BASE}/api/instances/${id}/map-data`);
  if (!r.ok) throw new Error("Failed to fetch map data");
  return r.json();
}
async function fetchMapLayout(id: number): Promise<MapLayout> {
  const r = await fetch(`${API_BASE}/api/instances/${id}/map-layout`);
  if (!r.ok) return { nodePositions: {}, customEdges: [] };
  return r.json();
}
async function saveMapLayout(id: number, layout: MapLayout): Promise<void> {
  await fetch(`${API_BASE}/api/instances/${id}/map-layout`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(layout),
  });
}

export function MapView({ instanceId }: MapViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const mapDataRef = useRef<MapData | null>(null);
  const autoEdgesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchMapData(instanceId), fetchMapLayout(instanceId)])
      .then(([mapData, layout]) => {
        mapDataRef.current = mapData;
        const { nodes: initialNodes, edges: autoEdges } = buildInitialLayout(mapData, layout.nodePositions);
        autoEdgesRef.current = new Set(autoEdges.map((e) => e.id));
        const customEdges: Edge[] = layout.customEdges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(176 43% 52%)" },
          style: { stroke: "hsl(176 43% 52%)", strokeWidth: 2 },
        }));
        setNodes(initialNodes);
        setEdges([...autoEdges, ...customEdges]);
      })
      .finally(() => setLoading(false));
  }, [instanceId]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            id: `custom-${Date.now()}`,
            markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(176 43% 52%)" },
            style: { stroke: "hsl(176 43% 52%)", strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    const nodePositions: Record<string, { x: number; y: number }> = {};
    for (const n of nodes) {
      nodePositions[n.id] = { x: n.position.x, y: n.position.y };
    }
    const customEdges = edges
      .filter((e) => !autoEdgesRef.current.has(e.id))
      .map((e) => ({ id: e.id, source: e.source, target: e.target }));
    await saveMapLayout(instanceId, { nodePositions, customEdges });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [nodes, edges, instanceId]);

  const handleReset = useCallback(() => {
    if (!mapDataRef.current) return;
    const { nodes: fresh, edges: autoEdges } = buildInitialLayout(mapDataRef.current, {});
    autoEdgesRef.current = new Set(autoEdges.map((e) => e.id));
    setNodes(fresh);
    setEdges(autoEdges);
  }, [setNodes, setEdges]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Loading map…
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No blocks to show on the map yet.
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      deleteKeyCode="Backspace"
      className="rounded-xl bg-background"
      proOptions={{ hideAttribution: true }}
    >
      <Background color="hsl(26 30% 84%)" gap={20} size={1} />
      <Controls showInteractive={false} />
      <MiniMap
        nodeColor={(n) => {
          if (n.type === "richtext") return "hsl(176 43% 52%)";
          if (n.type === "todoBlock" || n.type === "todoItem") return "hsl(16 75% 61%)";
          return "hsl(346 58% 57%)";
        }}
        maskColor="hsl(26 55% 94% / 0.7)"
      />
      <Panel position="top-right" className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={handleReset} title="Reset layout">
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
          Reset
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="w-3.5 h-3.5 mr-1.5" />
          {saved ? "Saved!" : saving ? "Saving…" : "Save layout"}
        </Button>
      </Panel>
    </ReactFlow>
  );
}
