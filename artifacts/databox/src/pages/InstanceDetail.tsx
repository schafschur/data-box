import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetInstance, useGetCategory, useListBlocks, useDeleteInstance, getGetInstanceQueryKey, getGetCategoryQueryKey, getListBlocksQueryKey, getListInstancesQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CreateBlockDialog } from "@/components/forms/CreateBlockDialog";
import { EditInstanceDialog } from "@/components/forms/EditInstanceDialog";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import { AnalysisPanel } from "@/components/blocks/AnalysisPanel";
import { MapView } from "@/components/blocks/MapView";
import { InstanceSearch } from "@/components/blocks/InstanceSearch";
import { Settings, Trash2, Edit, ChevronRight, BarChart2, Layers, Network, Download } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function InstanceDetail() {
  const { instanceId } = useParams();
  const id = parseInt(instanceId || "0", 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"blocks" | "analysis" | "map">("blocks");
  const [highlightedBlockId, setHighlightedBlockId] = useState<number | null>(null);

  function handleSearchNavigate(blockId: number) {
    setActiveTab("blocks");
    setHighlightedBlockId(blockId);
    setTimeout(() => {
      const el = document.getElementById(`block-${blockId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    setTimeout(() => setHighlightedBlockId(null), 2000);
  }

  const { data: instance, isLoading: isInstanceLoading } = useGetInstance(id, {
    query: { enabled: !!id, queryKey: getGetInstanceQueryKey(id) }
  });

  const { data: category } = useGetCategory(instance?.categoryId ?? 0, {
    query: { enabled: !!instance?.categoryId, queryKey: getGetCategoryQueryKey(instance?.categoryId ?? 0) }
  });

  const { data: blocks, isLoading: isBlocksLoading } = useListBlocks(id, {
    query: { enabled: !!id, queryKey: getListBlocksQueryKey(id) }
  });

  // Scroll to a specific event when arriving via a hash link (e.g. #event-42).
  // Retries with an interval because CalendarBlock fetches its events after blocks load.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    let attempts = 0;
    const interval = setInterval(() => {
      const el = document.querySelector(hash);
      if (el) {
        clearInterval(interval);
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (++attempts > 30) {
        clearInterval(interval);
      }
    }, 150);
    return () => clearInterval(interval);
  }, []);

  const deleteInstance = useDeleteInstance();

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

  const hasBlocks = !isBlocksLoading && (blocks?.length ?? 0) > 0;

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
            {instance && (
              <Button
                variant="ghost"
                size="icon"
                title="Export instance as PDF"
                onClick={() => window.open(`${API_BASE}/api/instances/${id}/export/pdf`)}
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
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

        {/* Instance-scoped search */}
        {hasBlocks && (
          <div className="mb-6">
            <InstanceSearch instanceId={id} onNavigate={handleSearchNavigate} />
          </div>
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
          ) : (blocks?.length ?? 0) === 0 ? (
            <div className="text-center py-20 border border-dashed rounded-lg bg-card/50">
              <h3 className="text-xl font-serif text-muted-foreground mb-4">No blocks yet</h3>
              <CreateBlockDialog instanceId={id} />
            </div>
          ) : (
            <div className="space-y-12">
              {(blocks ?? []).map((block) => (
                <div
                  key={block.id}
                  id={`block-${block.id}`}
                  className={cn(
                    "rounded-xl transition-shadow duration-500",
                    highlightedBlockId === block.id
                      ? "ring-2 ring-primary/60 ring-offset-2 shadow-lg shadow-primary/10"
                      : ""
                  )}
                >
                  <BlockRenderer block={block} />
                </div>
              ))}
            </div>
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
