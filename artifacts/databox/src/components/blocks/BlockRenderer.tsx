import { useState } from "react";
import { Block, useDeleteBlock, useUpdateBlock, getListBlocksQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Trash2, GripVertical, FileText, CheckSquare, Calendar, Image as ImageIcon, Check } from "lucide-react";
import { RichTextBlock } from "./RichTextBlock";
import { TodoBlock } from "./TodoBlock";
import { CalendarBlock } from "./CalendarBlock";
import { PhotoBlock } from "./PhotoBlock";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import type { DraggableAttributes } from "@dnd-kit/core";

const ICONS = {
  richtext: FileText,
  todo: CheckSquare,
  calendar: Calendar,
  photo: ImageIcon,
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
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md text-primary">
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
                className="text-2xl font-serif font-medium cursor-text hover:text-primary transition-colors"
                onClick={() => setIsEditingTitle(true)}
              >
                {block.title || <span className="text-muted-foreground italic text-lg">Untitled {block.type}</span>}
              </h3>
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
