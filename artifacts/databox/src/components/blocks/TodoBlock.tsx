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
import { Plus, Trash2, CheckCircle2, Circle, GripVertical, CalendarClock, Pencil, X, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";

function deadlineLabel(deadline: string): { label: string; urgent: boolean; overdue: boolean } {
  const d = parseISO(deadline);
  if (isToday(d))     return { label: "Today",    urgent: true,  overdue: false };
  if (isTomorrow(d))  return { label: "Tomorrow", urgent: true,  overdue: false };
  if (isPast(d))      return { label: `Overdue · ${format(d, "MMM d")}`, urgent: true, overdue: true };
  return { label: format(d, "MMM d, yyyy"), urgent: false, overdue: false };
}

function SortableTodoItem({
  item,
  onToggle,
  onDelete,
  onUpdateDeadline,
}: {
  item: TodoItem;
  onToggle: (id: number, completed: boolean) => void;
  onDelete: (id: number) => void;
  onUpdateDeadline: (id: number, deadline: string | null) => void;
}) {
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [deadlineInput, setDeadlineInput] = useState(item.deadline ?? "");

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const dl = item.deadline ? deadlineLabel(item.deadline) : null;
  const isUrgent  = !!dl?.urgent && !item.completed;
  const isOverdue = !!dl?.overdue && !item.completed;

  const handleDeadlineSave = () => {
    onUpdateDeadline(item.id, deadlineInput || null);
    setEditingDeadline(false);
  };

  const handleDeadlineClear = () => {
    setDeadlineInput("");
    onUpdateDeadline(item.id, null);
    setEditingDeadline(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center group rounded-md p-2 transition-all border",
        isDragging
          ? "border-primary/40 shadow-lg opacity-80 z-50 bg-card"
          : isOverdue
          ? "bg-destructive/8 border-destructive/25 hover:border-destructive/40"
          : isUrgent
          ? "bg-amber-50/60 border-amber-200/60 hover:border-amber-300 dark:bg-amber-950/20 dark:border-amber-800/40"
          : "bg-card border-transparent hover:border-border hover:shadow-sm"
      )}
    >
      {/* drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 mr-1 p-0.5 text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none transition-colors opacity-0 group-hover:opacity-100"
        tabIndex={-1}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* check button */}
      <button
        onClick={() => onToggle(item.id, !item.completed)}
        className={cn(
          "flex-shrink-0 mr-3 h-5 w-5 rounded-full border flex items-center justify-center transition-colors",
          item.completed
            ? "bg-primary border-primary text-primary-foreground"
            : isOverdue
            ? "border-destructive/50 hover:border-destructive text-transparent"
            : isUrgent
            ? "border-amber-400/60 hover:border-amber-500 text-transparent"
            : "border-muted-foreground/30 hover:border-primary text-transparent"
        )}
      >
        {item.completed ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
      </button>

      {/* text + deadline badge */}
      <div className="flex-1 min-w-0">
        <span className={cn("text-base transition-all", item.completed ? "line-through text-muted-foreground" : "text-foreground")}>
          {item.text}
        </span>

        {editingDeadline ? (
          <div className="flex items-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
            <Input
              type="date"
              value={deadlineInput}
              onChange={(e) => setDeadlineInput(e.target.value)}
              className="h-6 text-xs w-[140px] px-1.5"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleDeadlineSave(); if (e.key === "Escape") setEditingDeadline(false); }}
            />
            <button onClick={handleDeadlineSave} className="text-primary hover:text-primary/80"><Check className="h-3.5 w-3.5" /></button>
            {item.deadline && (
              <button onClick={handleDeadlineClear} className="text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
            )}
            <button onClick={() => setEditingDeadline(false)} className="text-muted-foreground hover:text-foreground text-xs">cancel</button>
          </div>
        ) : dl && !item.completed ? (
          <div className="flex items-center gap-1 mt-0.5">
            <span className={cn(
              "text-[11px] font-medium flex items-center gap-1",
              isOverdue ? "text-destructive" : "text-amber-600 dark:text-amber-400"
            )}>
              <CalendarClock className="h-3 w-3" />
              {dl.label}
            </span>
            <button
              onClick={() => { setDeadlineInput(item.deadline ?? ""); setEditingDeadline(true); }}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-muted-foreground transition-opacity"
            >
              <Pencil className="h-2.5 w-2.5" />
            </button>
          </div>
        ) : null}
      </div>

      {/* deadline add button (no deadline set, not completed) */}
      {!dl && !item.completed && !editingDeadline && (
        <button
          onClick={() => { setDeadlineInput(""); setEditingDeadline(true); }}
          className="opacity-0 group-hover:opacity-100 mr-1 p-1 text-muted-foreground/40 hover:text-muted-foreground transition-all"
          title="Add deadline"
        >
          <CalendarClock className="h-3.5 w-3.5" />
        </button>
      )}

      {/* delete */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
        onClick={() => onDelete(item.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function TodoBlock({ block }: { block: Block }) {
  const [newItemText, setNewItemText]       = useState("");
  const [newDeadline, setNewDeadline]       = useState("");
  const [showDeadlineInput, setShowDeadlineInput] = useState(false);
  const [sortedItems, setSortedItems]       = useState<TodoItem[]>([]);
  const queryClient = useQueryClient();

  const { data: items } = useListTodoItems(block.id, {
    query: { enabled: !!block.id, queryKey: getListTodoItemsQueryKey(block.id) },
  });

  useEffect(() => {
    if (items !== undefined) setSortedItems(items);
  }, [items]);

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
      { blockId: block.id, data: { text: newItemText, deadline: newDeadline || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTodoItemsQueryKey(block.id) });
          setNewItemText("");
          setNewDeadline("");
          setShowDeadlineInput(false);
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

  const handleUpdateDeadline = (id: number, deadline: string | null) => {
    updateTodo.mutate(
      { id, data: { deadline } },
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
              <SortableTodoItem
                key={item.id}
                item={item}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onUpdateDeadline={handleUpdateDeadline}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <form onSubmit={handleAdd} className="pt-2 border-t border-border/50 space-y-1.5">
        <div className="flex items-center gap-2">
          <Input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="Add a new item..."
            className="bg-transparent border-none shadow-none focus-visible:ring-0 px-2"
          />
          <button
            type="button"
            onClick={() => setShowDeadlineInput((v) => !v)}
            className={cn(
              "p-1.5 rounded transition-colors flex-shrink-0",
              showDeadlineInput ? "text-primary" : "text-muted-foreground/40 hover:text-muted-foreground"
            )}
            title="Add deadline"
          >
            <CalendarClock className="h-4 w-4" />
          </button>
          <Button type="submit" size="sm" variant="ghost" disabled={!newItemText.trim() || createTodo.isPending}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {showDeadlineInput && (
          <div className="flex items-center gap-2 px-2">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Deadline</label>
            <Input
              type="date"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              className="h-7 text-xs w-[148px]"
              autoFocus
            />
          </div>
        )}
      </form>
    </div>
  );
}
