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
  Block,
  useListTodoItems,
  useCreateTodoItem,
  useUpdateTodoItem,
  useDeleteTodoItem,
  useReorderTodoItems,
  getListTodoItemsQueryKey,
} from "@workspace/api-client-react";
import type { TodoItem } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, CheckCircle2, Circle, GripVertical } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

function SortableTodoItem({
  item,
  onToggle,
  onDelete,
}: {
  item: TodoItem;
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center group bg-card border rounded-md p-2 transition-all",
        isDragging ? "border-primary/40 shadow-lg opacity-80 z-50" : "border-transparent hover:border-border hover:shadow-sm"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 mr-1 p-0.5 text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none transition-colors opacity-0 group-hover:opacity-100"
        tabIndex={-1}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <button
        onClick={() => onToggle(item.id, !item.completed)}
        className={cn(
          "flex-shrink-0 mr-3 h-5 w-5 rounded-full border flex items-center justify-center transition-colors",
          item.completed
            ? "bg-primary border-primary text-primary-foreground"
            : "border-muted-foreground/30 hover:border-primary text-transparent"
        )}
      >
        {item.completed ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
      </button>

      <span className={cn("flex-1 text-base transition-all", item.completed ? "line-through text-muted-foreground" : "text-foreground")}>
        {item.text}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
        onClick={() => onDelete(item.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function TodoBlock({ block }: { block: Block }) {
  const [newItemText, setNewItemText] = useState("");
  const [sortedItems, setSortedItems] = useState<TodoItem[]>([]);
  const queryClient = useQueryClient();

  const { data: items = [] } = useListTodoItems(block.id, {
    query: { enabled: !!block.id, queryKey: getListTodoItemsQueryKey(block.id) },
  });

  useEffect(() => { setSortedItems(items); }, [items]);

  const createTodo  = useCreateTodoItem();
  const updateTodo  = useUpdateTodoItem();
  const deleteTodo  = useDeleteTodoItem();
  const reorderTodo = useReorderTodoItems();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedItems.findIndex((i) => i.id === active.id);
    const newIndex = sortedItems.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(sortedItems, oldIndex, newIndex);
    setSortedItems(reordered);
    reorderTodo.mutate(
      { blockId: block.id, data: { ids: reordered.map((i) => i.id) } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTodoItemsQueryKey(block.id) }) }
    );
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    createTodo.mutate(
      { blockId: block.id, data: { text: newItemText } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTodoItemsQueryKey(block.id) });
          setNewItemText("");
        },
      }
    );
  };

  const handleToggle = (id: number, completed: boolean) => {
    updateTodo.mutate(
      { id, data: { completed } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTodoItemsQueryKey(block.id) }) }
    );
  };

  const handleDelete = (id: number) => {
    deleteTodo.mutate(
      { id },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTodoItemsQueryKey(block.id) }) }
    );
  };

  const completedCount = sortedItems.filter((i) => i.completed).length;
  const totalCount     = sortedItems.length;
  const progress       = totalCount === 0 ? 0 : (completedCount / totalCount) * 100;

  return (
    <div className="space-y-6">
      {totalCount > 0 && (
        <div className="flex items-center gap-4">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-sm font-medium text-muted-foreground w-12 text-right">
            {Math.round(progress)}%
          </span>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortedItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {sortedItems.map((item) => (
              <SortableTodoItem key={item.id} item={item} onToggle={handleToggle} onDelete={handleDelete} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <form onSubmit={handleAdd} className="flex items-center gap-2 pt-2 border-t border-border/50">
        <Input
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          placeholder="Add a new item..."
          className="bg-transparent border-none shadow-none focus-visible:ring-0 px-2"
        />
        <Button type="submit" size="sm" variant="ghost" disabled={!newItemText.trim() || createTodo.isPending}>
          <Plus className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
