import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetInstance, useListBlocks, useDeleteInstance, getGetInstanceQueryKey, getListBlocksQueryKey, getListInstancesQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CreateBlockDialog } from "@/components/forms/CreateBlockDialog";
import { EditInstanceDialog } from "@/components/forms/EditInstanceDialog";
import { BlockRenderer } from "@/components/blocks/BlockRenderer";
import { AnalysisPanel } from "@/components/blocks/AnalysisPanel";
import { Settings, Trash2, Edit, ChevronRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

export function InstanceDetail() {
  const { instanceId } = useParams();
  const id = parseInt(instanceId || "0", 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);

  const { data: instance, isLoading: isInstanceLoading } = useGetInstance(id, {
    query: { enabled: !!id, queryKey: getGetInstanceQueryKey(id) }
  });

  const { data: blocks, isLoading: isBlocksLoading } = useListBlocks(id, {
    query: { enabled: !!id, queryKey: getListBlocksQueryKey(id) }
  });

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

  return (
    <AppLayout>
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out pb-20">
        
        {/* Breadcrumb back to category */}
        {instance && (
          <div className="flex items-center text-sm text-muted-foreground font-medium mb-[-1rem]">
            <Link href={`/categories/${instance.categoryId}`} className="hover:text-foreground transition-colors">
              Category
            </Link>
            <ChevronRight className="w-4 h-4 mx-1 opacity-50" />
            <span className="text-foreground">{instance.name}</span>
          </div>
        )}

        <div className="flex items-center justify-between border-b pb-6">
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

        <div className="space-y-8">
          {isBlocksLoading ? (
            <div className="space-y-6">
              {[1, 2].map(i => (
                <Skeleton key={i} className="h-64 w-full rounded-lg" />
              ))}
            </div>
          ) : blocks?.length === 0 ? (
             <div className="text-center py-20 border border-dashed rounded-lg bg-card/50">
               <h3 className="text-xl font-serif text-muted-foreground mb-4">No blocks yet</h3>
               <CreateBlockDialog instanceId={id} />
             </div>
          ) : (
            <div className="space-y-12">
              {blocks?.map((block) => (
                <BlockRenderer key={block.id} block={block} />
              ))}
            </div>
          )}
        </div>

        {/* Analysis Panel */}
        {!isBlocksLoading && blocks && blocks.length > 0 && (
          <div className="pt-10 border-t mt-16">
            <h2 className="text-2xl font-serif mb-6">Analysis</h2>
            <AnalysisPanel instanceId={id} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
