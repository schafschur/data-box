import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetInstance, useGetCategory, useListBlocks, useDeleteInstance, useReorderBlocks, getGetInstanceQueryKey, getListBlocksQueryKey, getListInstancesQueryKey } from "@workspace/api-client-react";
import type { Block } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CreateBlockDialog } from "@/components/forms/CreateBlockDialog";
import { EditInstanceDialog } from "@/components/forms/EditInstanceDialog";
import { SortableBlockRenderer } from "@/components/blocks/SortableBlockRenderer";
import { AnalysisPanel } from "@/components/blocks/AnalysisPanel";
import { MapView } from "@/components/blocks/MapView";
import { Settings, Trash2, Edit, ChevronRight, BarChart2, Layers, Network } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

export function InstanceDetail() {
  const { instanceId } = useParams();
  const id = parseInt(instanceId || "0", 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"blocks" | "analysis" | "map">("blocks");
  const [localBlocks, setLocalBlocks] = useState<Block[]>([]);

  const { data: instance, isLoading: isInstanceLoading } = useGetInstance(id, {
    query: { enabled: !!id, queryKey: getGetInstanceQueryKey(id) }
  });

  const { data: category } = useGetCategory(instance?.categoryId ?? 0, {
    query: { enabled: !!instance?.categoryId }
  });

  const { data: blocks, isLoading: isBlocksLoading } = useListBlocks(id, {
    query: { enabled: !!id, queryKey: getListBlocksQueryKey(id) }
  });

  useEffect(() => {
    if (blocks) {
      setLocalBlocks(blocks);
    }
  }, [blocks]);

  useEffect(() => {
    if (!blocks || blocks.length === 0) return;
    const hash = window.location.hash;
    if (!hash) return;
    const el = document.querySelector(hash);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [blocks]);

  const deleteInstance = useDeleteInstance();
  const reorderBlocks = useReorderBlocks();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localBlocks.findIndex((b) => b.id === active.id);
    const newIndex = localBlocks.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(localBlocks, oldIndex, newIndex);
    setLocalBlocks(reordered);

    reorderBlocks.mutate(
      { instanceId: id, data: { ids: reordered.map((b) => b.id) } },
      {
        onSuccess: (updatedBlocks) => {
          queryClient.setQueryData(getListBlocksQueryKey(id), updatedBlocks);
        },
        onError: () => {
          setLocalBlocks(blocks ?? []);
        },
      }
    );
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${instance?.name}"?`)) {
      deleteInstance.mutate(
        { id },
        {
          onSuccess: () => {
            if (instance?.categoryId) {
              queryClient.invalidateQueries({ queryKey: getListInstancesQueryKey(instance.categoryId) });
              setLocation(`/categories/${instance.categoryId}`);
            } else {
              setLocation("/");
            }
          }
        }
      );
    }
  };

  const hasBlocks = !isBlocksLoading && localBlocks.length > 0;

  return (
    <AppLayout>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-20">

        {instance && (
          <div className="flex items-center text-sm text-muted-foreground font-medium mb-4">
            <Link href={`/categories/${instance.categoryId}`} className="hover:text-foreground transition-colors">
              {category?.name ?? "Category"}
            </Link>
            <ChevronRight className="w-4 h-4 mx-1 opacity-50" />
            <span className="text-foreground">{instance.name}</span>
          </div>
        )}

        <div className="flex items-center justify-between border-b pb-6 mb-8">
          {isInstanceLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-5 w-72" />
            </div>
          ) : (
            <div>
              <h1 className="text-4xl font-serif tracking-tight text-foreground">{instance?.name}</h1>
              {instance?.description && (
                <p className="text-muted-foreground text-lg mt-2">{instance.description}</p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <CreateBlockDialog instanceId={id} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditOpen(true)}>
                  <Edit className="w-4 h-4 mr-2" /> Edit Instance
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Instance
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {instance && (
          <EditInstanceDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            instance={instance}
          />
        )}

        {/* Tab bar — always visible when there are blocks */}
        {hasBlocks && (
          <div className="flex border-b mb-6 gap-0">
            <button
              onClick={() => setActiveTab("blocks")}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                activeTab === "blocks"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Layers className="w-4 h-4" />
              Blocks
            </button>
            <button
              onClick={() => setActiveTab("analysis")}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                activeTab === "analysis"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <BarChart2 className="w-4 h-4" />
              Analysis
            </button>
            <button
              onClick={() => setActiveTab("map")}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                activeTab === "map"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Network className="w-4 h-4" />
              Map
            </button>
          </div>
        )}

        {/* Blocks tab */}
        <div className={cn(activeTab !== "blocks" ? "hidden" : "block")}>
          {isBlocksLoading ? (
            <div className="space-y-6">
              {[1, 2].map(i => (
                <Skeleton key={i} className="h-64 w-full rounded-lg" />
              ))}
            </div>
          ) : localBlocks.length === 0 ? (
            <div className="text-center py-20 border border-dashed rounded-lg bg-card/50">
              <h3 className="text-xl font-serif text-muted-foreground mb-4">No blocks yet</h3>
              <CreateBlockDialog instanceId={id} />
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={localBlocks.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-12">
                  {localBlocks.map((block) => (
                    <SortableBlockRenderer key={block.id} block={block} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Analysis tab */}
        {hasBlocks && activeTab === "analysis" && (
          <div className="max-w-2xl">
            <AnalysisPanel instanceId={id} />
          </div>
        )}

        {/* Map tab */}
        {hasBlocks && activeTab === "map" && (
          <div className="w-full rounded-xl overflow-hidden border border-border" style={{ height: "calc(100vh - 280px)", minHeight: 480 }}>
            <MapView instanceId={id} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
