import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useListListItems,
  useCreateListItem,
  useUpdateListItem,
  useDeleteListItem,
  useReorderListItems,
  getListListItemsQueryKey,
} from "@workspace/api-client-react";
import type { Block, ListItem, ListItemInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GripVertical, Plus, Pencil, Trash2, ChevronDown, ChevronRight, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ItemFormProps {
  initial?: ListItemInput;
  onSave: (data: ListItemInput) => void;
  onCancel: () => void;
  isSaving?: boolean;
  autoFocusTitle?: boolean;
}

function ItemForm({ initial, onSave, onCancel, isSaving, autoFocusTitle }: ItemFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: description.trim() || null,
      notes: notes.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 py-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        autoFocus={autoFocusTitle}
        className="text-sm font-medium"
      />
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="text-sm resize-none"
      />
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        rows={2}
        className="text-sm resize-none"
      />
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-3.5 h-3.5 mr-1" /> Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!title.trim() || isSaving}>
          <Check className="w-3.5 h-3.5 mr-1" /> Save
        </Button>
      </div>
    </form>
  );
}

interface SortableItemProps {
  item: ListItem;
  isEditing: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (data: ListItemInput) => void;
  onDelete: () => void;
  isSaving: boolean;
}

function SortableItem({
  item,
  isEditing,
  isExpanded,
  onToggleExpand,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  isSaving,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const hasDetail = !!(item.description || item.notes);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group bg-background border border-border rounded-lg overflow-hidden",
        isDragging && "opacity-50 z-50 relative shadow-lg"
      )}
    >
      {isEditing ? (
        <div className="px-3 pb-1">
          <ItemForm
            initial={{ title: item.title, description: item.description, notes: item.notes }}
            onSave={onSaveEdit}
            onCancel={onCancelEdit}
            isSaving={isSaving}
          />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 px-3 py-2.5 min-h-[44px]">
            <button
              className="flex-shrink-0 opacity-0 group-hover:opacity-30 hover:!opacity-60 cursor-grab active:cursor-grabbing touch-none p-0.5 rounded"
              {...(attributes as object)}
              {...(listeners as object)}
              tabIndex={-1}
            >
              <GripVertical className="w-4 h-4" />
            </button>

            <button
              className="flex-shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              onClick={onToggleExpand}
              disabled={!hasDetail}
              tabIndex={hasDetail ? 0 : -1}
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {hasDetail ? (
                isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )
              ) : (
                <span className="w-4 h-4 block" />
              )}
            </button>

            <span
              className="flex-1 text-sm font-medium leading-snug cursor-pointer select-none"
              onClick={hasDetail ? onToggleExpand : undefined}
            >
              {item.title}
            </span>

            <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                onClick={onStartEdit}
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                onClick={onDelete}
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {isExpanded && hasDetail && (
            <div className="px-10 pb-3 space-y-1.5">
              {item.description && (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {item.description}
                </p>
              )}
              {item.notes && (
                <p className="text-xs text-muted-foreground/70 italic leading-relaxed whitespace-pre-wrap">
                  {item.notes}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function ListBlock({ block }: { block: Block }) {
  const queryClient = useQueryClient();
  const { data: items } = useListListItems(block.id);
  const [sortedItems, setSortedItems] = useState<ListItem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (items !== undefined) {
      setSortedItems(items as ListItem[]);
    }
  }, [items]);

  const createItem = useCreateListItem();
  const updateItem = useUpdateListItem();
  const deleteItem = useDeleteListItem();
  const reorderItems = useReorderListItems();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListListItemsQueryKey(block.id) });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedItems.findIndex((i) => i.id === active.id);
    const newIndex = sortedItems.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(sortedItems, oldIndex, newIndex);
    setSortedItems(reordered);
    reorderItems.mutate(
      { blockId: block.id, data: { ids: reordered.map((i) => i.id) } },
      { onError: () => setSortedItems(items as ListItem[]) }
    );
  };

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveEdit = (id: number, data: ListItemInput) => {
    updateItem.mutate(
      { id, data },
      {
        onSuccess: () => {
          invalidate();
          setEditingId(null);
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    setSortedItems((prev) => prev.filter((i) => i.id !== id));
    deleteItem.mutate(
      { id },
      { onError: () => setSortedItems(items as ListItem[]) }
    );
    invalidate();
  };

  return (
    <div className="space-y-1.5">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortedItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {sortedItems.map((item) => (
            <SortableItem
              key={item.id}
              item={item}
              isEditing={editingId === item.id}
              isExpanded={expandedIds.has(item.id)}
              onToggleExpand={() => toggleExpand(item.id)}
              onStartEdit={() => setEditingId(item.id)}
              onCancelEdit={() => setEditingId(null)}
              onSaveEdit={(data) => handleSaveEdit(item.id, data)}
              onDelete={() => handleDelete(item.id)}
              isSaving={updateItem.isPending}
            />
          ))}
        </SortableContext>
      </DndContext>

      {sortedItems.length === 0 && !isAdding && (
        <p className="text-xs text-muted-foreground/60 italic py-2 text-center">No items yet.</p>
      )}

      {isAdding ? (
        <div className="bg-background border border-primary/30 rounded-lg px-3 pb-1">
          <ItemForm
            autoFocusTitle
            onSave={(data) => {
              createItem.mutate(
                { blockId: block.id, data },
                {
                  onSuccess: () => {
                    invalidate();
                    setIsAdding(false);
                  },
                }
              );
            }}
            onCancel={() => setIsAdding(false)}
            isSaving={createItem.isPending}
          />
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-primary/40 rounded-lg px-4 py-2.5 w-full transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add item
        </button>
      )}
    </div>
  );
}
