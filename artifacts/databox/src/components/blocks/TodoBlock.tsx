import { useState } from "react";
import { Block, useListTodoItems, useCreateTodoItem, useUpdateTodoItem, useDeleteTodoItem, getListTodoItemsQueryKey } from "@workspace/api-client-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function TodoBlock({ block }: { block: Block }) {
  const [newItemText, setNewItemText] = useState("");
  const queryClient = useQueryClient();
  
  const { data: items = [] } = useListTodoItems(block.id, {
    query: { enabled: !!block.id, queryKey: getListTodoItemsQueryKey(block.id) }
  });

  const createTodo = useCreateTodoItem();
  const updateTodo = useUpdateTodoItem();
  const deleteTodo = useDeleteTodoItem();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    createTodo.mutate(
      { data: { text: newItemText, blockId: block.id } as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTodoItemsQueryKey(block.id) });
          setNewItemText("");
        }
      }
    );
  };

  const handleToggle = (id: number, completed: boolean) => {
    updateTodo.mutate(
      { id, data: { completed } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTodoItemsQueryKey(block.id) });
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteTodo.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTodoItemsQueryKey(block.id) });
        }
      }
    );
  };

  const completedCount = items.filter(i => i.completed).length;
  const totalCount = items.length;
  const progress = totalCount === 0 ? 0 : (completedCount / totalCount) * 100;

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

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center group bg-card border border-transparent hover:border-border hover:shadow-sm rounded-md p-2 transition-all">
            <button 
              onClick={() => handleToggle(item.id, !item.completed)}
              className={cn(
                "flex-shrink-0 mr-3 h-5 w-5 rounded-full border flex items-center justify-center transition-colors",
                item.completed ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30 hover:border-primary text-transparent"
              )}
            >
              {item.completed ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
            </button>
            <span className={cn(
              "flex-1 text-base transition-all",
              item.completed ? "line-through text-muted-foreground" : "text-foreground"
            )}>
              {item.text}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
              onClick={() => handleDelete(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

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
