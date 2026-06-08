import { useState, useRef, useEffect, type ComponentType } from "react";
import { Block, useDeleteBlock, useUpdateBlock, getListBlocksQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Trash2, GripVertical, FileText, CheckSquare, Calendar, Image as ImageIcon, Check, Flame, BookOpen, Users } from "lucide-react";
import { RichTextBlock } from "./RichTextBlock";
import { TodoBlock } from "./TodoBlock";
import { CalendarBlock } from "./CalendarBlock";
import { PhotoBlock } from "./PhotoBlock";
import { PdfBlock } from "./PdfBlock";
import { ContactBlock } from "./ContactBlock";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import type { DraggableAttributes } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  richtext: FileText,
  todo: CheckSquare,
  calendar: Calendar,
  photo: ImageIcon,
  pdf: BookOpen,
  contact: Users,
};

function importanceBadgeClass(imp: number): string {
  if (imp <= 2) return "bg-slate-100 text-slate-500 border-slate-200";
  if (imp <= 4) return "bg-blue-50 text-blue-500 border-blue-200";
  if (imp <= 6) return "bg-teal-50 text-teal-600 border-teal-200";
  if (imp <= 8) return "bg-amber-50 text-amber-600 border-amber-200";
  return "bg-orange-50 text-orange-500 border-orange-200";
}

function importanceStripeColor(imp: number): string {
  if (imp <= 2) return "#94a3b8";
  if (imp <= 4) return "#60a5fa";
  if (imp <= 6) return "#2dd4bf";
  if (imp <= 8) return "#fbbf24";
  return "#f97316";
}

interface BlockRendererProps {
  block: Block;
  dragHandleRef?: (node: HTMLElement | null) => void;
  dragHandleAttributes?: DraggableAttributes;
  dragHandleListeners?: SyntheticListenerMap;
}

export function BlockRenderer({ block, dragHandleRef, dragHandleAttributes, dragHandleListeners }: BlockRendererProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(block.title || "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [localImportance, setLocalImportance] = useState<number | null>(block.importance ?? null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const deleteBlock = useDeleteBlock();
  const updateBlock = useUpdateBlock();

  // Keep local importance in sync when parent block data refreshes
  useEffect(() => {
    setLocalImportance(block.importance ?? null);
  }, [block.importance]);

  const Icon = ICONS[block.type];

  // Close picker when clicking outside
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerOpen]);

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
    const previous = localImportance;
    // Optimistic update: close picker and show badge immediately
    setLocalImportance(value);
    setPickerOpen(false);

    updateBlock.mutate(
      { id: block.id, data: { importance: value } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBlocksQueryKey(block.instanceId) });
        },
        onError: () => {
          // Revert on failure
          setLocalImportance(previous);
        }
      }
    );
  };

  const imp = localImportance;
  const badgeClass = imp ? importanceBadgeClass(imp) : "";

  return (
    <div className="group relative bg-card rounded-xl shadow-sm border border-card-border overflow-visible transition-shadow hover:shadow-md">
      {imp && (
        <div
          className="absolute top-0 left-0 right-0 h-[5px] rounded-t-xl z-10 pointer-events-none"
          style={{ backgroundColor: importanceStripeColor(imp) }}
        />
      )}
      <div
        ref={dragHandleRef}
        {...dragHandleAttributes}
        {...dragHandleListeners}
        className={cn(
          "absolute left-0 bottom-0 w-8 bg-muted/30 flex items-start justify-center pt-4 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none rounded-l-xl",
          imp ? "top-[5px]" : "top-0"
        )}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      <div className={cn("pl-10 p-6", imp && "pt-8")}>
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
                {block.title || <span className="text-muted-foreground italic text-lg">Untitled {block.type === "pdf" ? "PDF" : block.type}</span>}
              </h3>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-3">
            {/* Importance badge + custom picker */}
            <div ref={pickerRef} className="relative">
              <button
                onClick={() => setPickerOpen((o) => !o)}
                className={cn(
                  "h-7 px-2 gap-1 text-xs border rounded-md flex items-center transition-opacity",
                  imp
                    ? cn(badgeClass, "opacity-100")
                    : "opacity-0 group-hover:opacity-100 text-muted-foreground border-border bg-transparent hover:bg-muted/40"
                )}
              >
                <Flame className="w-3 h-3" />
                {imp ?? "—"}
              </button>

              {pickerOpen && (
                <div className="absolute right-0 top-9 z-50 bg-popover border border-border rounded-lg shadow-lg p-3 min-w-max">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">
                    Importance — 1 minor · 10 essential
                  </p>
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
                </div>
              )}
            </div>

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
          {block.type === "pdf" && <PdfBlock block={block} />}
          {block.type === "contact" && <ContactBlock block={block} />}
        </div>
      </div>
    </div>
  );
}
