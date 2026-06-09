import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetCategory, useListInstances, useDeleteCategory, getGetCategoryQueryKey, getListInstancesQueryKey, getListCategoriesQueryKey } from "@workspace/api-client-react";
import { CreateInstanceDialog } from "@/components/forms/CreateInstanceDialog";
import { EditCategoryDialog } from "@/components/forms/EditCategoryDialog";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Settings, Trash2, Edit, GripVertical, Download } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useDrag, type DragState } from "@/contexts/DragContext";
import type { InstanceWithBlockCount, Category } from "@workspace/api-client-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function DraggableInstanceCard({
  instance,
  category,
}: {
  instance: InstanceWithBlockCount;
  category: Category | undefined;
}) {
  const { dragging, setDragging } = useDrag();
  const [isDraggingThis, setIsDraggingThis] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDraggingThis(true);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("instanceId", String(instance.id));
    const state: DragState = {
      instanceId: instance.id,
      fromCategoryId: instance.categoryId,
      instanceName: instance.name,
    };
    setDragging(state);
  };

  const handleDragEnd = () => {
    setIsDraggingThis(false);
    setDragging(null);
  };

  const isAnyDragging = !!dragging;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        "group/card transition-all duration-150 select-none",
        isDraggingThis ? "opacity-40 scale-95 cursor-grabbing" : "cursor-grab",
        isAnyDragging && !isDraggingThis && "opacity-75",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/instances/${instance.id}`}>
        <Card
          className="transition-all hover-elevate h-full flex flex-col justify-between relative overflow-hidden"
          style={{
            borderColor: isHovered && !isAnyDragging
              ? `${category?.color}80`
              : undefined,
          }}
        >
          <div
            className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-40 transition-opacity"
            title="Drag to move to another category"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <CardHeader>
            <CardTitle
              className="font-serif text-xl transition-colors pr-4"
              style={{
                color: isHovered && !isAnyDragging ? category?.color : undefined,
              }}
            >
              {instance.name}
            </CardTitle>
            {instance.description && (
              <CardDescription className="mt-2 line-clamp-2">
                {instance.description}
              </CardDescription>
            )}
            <div className="text-xs font-medium text-muted-foreground mt-4 uppercase tracking-wider flex gap-4">
              <span>{instance.blockCount} {instance.blockCount === 1 ? "block" : "blocks"}</span>
            </div>
          </CardHeader>
        </Card>
      </Link>
    </div>
  );
}

export function CategoryDetail() {
  const { categoryId } = useParams();
  const id = parseInt(categoryId || "0", 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);

  const { data: category, isLoading: isCategoryLoading } = useGetCategory(id, {
    query: { enabled: !!id, queryKey: getGetCategoryQueryKey(id) }
  });

  const { data: instances, isLoading: isInstancesLoading } = useListInstances(id, {
    query: { enabled: !!id, queryKey: getListInstancesQueryKey(id) }
  });

  const deleteCategory = useDeleteCategory();

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${category?.name}" and all its instances?`)) {
      deleteCategory.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
            setLocation("/");
          }
        }
      );
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
        <div className="flex items-center justify-between border-b pb-6">
          {isCategoryLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-5 w-72" />
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: category?.color || "var(--primary)" }}
                />
                <h1 className="text-4xl font-serif tracking-tight text-foreground">{category?.name}</h1>
              </div>
              {category?.description && (
                <p className="text-muted-foreground text-lg">{category.description}</p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <CreateInstanceDialog categoryId={id} />

            {category && (
              <Button
                variant="ghost"
                size="icon"
                title="Export category as PDF"
                onClick={() => window.open(`${API_BASE}/api/categories/${id}/export/pdf`)}
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
                  <Edit className="w-4 h-4 mr-2" /> Edit Category
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Category
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {category && (
          <EditCategoryDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            category={category}
          />
        )}

        {isInstancesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        ) : instances?.length === 0 ? (
          <div className="text-center py-20 border border-dashed rounded-lg bg-card/50">
            <h3 className="text-xl font-serif text-muted-foreground mb-4">No instances yet</h3>
            <CreateInstanceDialog categoryId={id} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {instances?.map((instance) => (
              <DraggableInstanceCard
                key={instance.id}
                instance={instance}
                category={category}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
