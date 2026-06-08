import { useState } from "react";
import { Block, useDeleteBlock, useUpdateBlock, getListBlocksQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Trash2, GripVertical, FileText, CheckSquare, Calendar, Image as ImageIcon, Check, Flame } from "lucide-react";
import { RichTextBlock } from "./RichTextBlock";
import { TodoBlock } from "./TodoBlock";
import { CalendarBlock } from "./CalendarBlock";
import { PhotoBlock } from "./PhotoBlock";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import type { DraggableAttributes } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

const ICONS = {
  richtext: FileText,
  todo: CheckSquare,
  calendar: Calendar,
  photo: ImageIcon,
};

const IMPORTANCE_COLORS: Record<number, string> = {
  1:  "bg-slate-100 text-slate-500 border-slate-200",
  2:  "bg-slate-100 text-slate-500 border-slate-200",
  3:  "bg-blue-50 text-blue-500 border-blue-200",
  4:  "bg-blue-50 text-blue-500 border-blue-200",
  5:  "bg-teal-50 text-teal-600 border-teal-200",
  6:  "bg-teal-50 text-teal-600 border-teal-200",
  7:  "bg-amber-50 text-amber-600 border-amber-200",
  8:  "bg-amber-50 text-amber-600 border-amber-200",
  9:  "bg-coral-50 text-accent border-accent/30",
  10: "bg-coral-50 text-accent border-accent/30",
};

interface BlockRendererProps {
  block: Block;
  dragHandleRef?: (node: HTMLElement | null) => void;
  dragHandleAttributes?: DraggableAttributes;
  dragHandleListeners?: SyntheticListenerMap;
}

export function BlockRenderer({ block, dragHandleRef, dragHandleAttributes, dragHandleListeners }: BlockRendererProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(block.title || "");
  const [importanceOpen, setImportanceOpen] = useState(false);
  const queryClient = useQueryClient();
  const deleteBlock = useDeleteBlock();
  const updateBlock = useUpdateBlock();

  const Icon = ICONS[block.type];

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this block?")) {
      deleteBlock.mutate(
        { id: block.id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListBlocksQueryKey(block.instanceId) });
          }
        }
      );
    }
  };

  const handleSaveTitle = () => {
    updateBlock.mutate(
      { id: block.id, data: { title } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBlocksQueryKey(block.instanceId) });
          setIsEditingTitle(false);
        }
      }
    );
  };

  const handleSetImportance = (value: number | null) => {
    updateBlock.mutate(
      { id: block.id, data: { importance: value } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBlocksQueryKey(block.instanceId) });
          setImportanceOpen(false);
        }
      }
    );
  };

  const imp = block.importance;
  const impColorClass = imp ? IMPORTANCE_COLORS[imp] : "";

  return (
    <div className="group relative bg-card rounded-xl shadow-sm border border-card-border overflow-hidden transition-shadow hover:shadow-md">
      <div
        ref={dragHandleRef}
        {...dragHandleAttributes}
        {...dragHandleListeners}
        className="absolute left-0 top-0 bottom-0 w-8 bg-muted/30 flex items-start justify-center pt-4 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      <div className="pl-10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-primary/10 rounded-md text-primary shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-8 font-serif text-xl px-2 w-64"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveTitle}>
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <h3
                className="text-2xl font-serif font-medium cursor-text hover:text-primary transition-colors truncate"
                onClick={() => setIsEditingTitle(true)}
              >
                {block.title || <span className="text-muted-foreground italic text-lg">Untitled {block.type}</span>}
              </h3>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-3">
            {/* Importance badge + picker */}
            <Popover open={importanceOpen} onOpenChange={setImportanceOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-2 gap-1 text-xs border transition-opacity",
                    imp
                      ? cn(impColorClass, "opacity-100")
                      : "opacity-0 group-hover:opacity-100 text-muted-foreground border-border"
                  )}
                >
                  <Flame className="w-3 h-3" />
                  {imp ?? "—"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="end">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Importance (1 = minor, 10 = essential)</p>
                <div className="flex gap-1">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => handleSetImportance(n === imp ? null : n)}
                      className={cn(
                        "w-7 h-7 rounded text-xs font-semibold border transition-all",
                        n === imp
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                {imp && (
                  <button
                    onClick={() => handleSetImportance(null)}
                    className="mt-2 text-xs text-muted-foreground hover:text-destructive w-full text-center"
                  >
                    Clear
                  </button>
                )}
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="pl-2">
          {block.type === "richtext" && <RichTextBlock block={block} />}
          {block.type === "todo" && <TodoBlock block={block} />}
          {block.type === "calendar" && <CalendarBlock block={block} />}
          {block.type === "photo" && <PhotoBlock block={block} />}
        </div>
      </div>
    </div>
  );
}
