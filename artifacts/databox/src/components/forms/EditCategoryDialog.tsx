import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUpdateCategory, getGetCategoryQueryKey, getListCategoriesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  color: z.string().optional(),
});

export function EditCategoryDialog({ 
  open, 
  onOpenChange, 
  category 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  category: { id: number; name: string; description?: string | null; color?: string | null; };
}) {
  const queryClient = useQueryClient();
  const updateCategory = useUpdateCategory();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: category.name,
      description: category.description || "",
      color: category.color || "#D27B5A",
    },
  });

  useEffect(() => {
    form.reset({
      name: category.name,
      description: category.description || "",
      color: category.color || "#D27B5A",
    });
  }, [category, form]);

  const onSubmit = (data: z.infer<typeof schema>) => {
    updateCategory.mutate(
      { id: category.id, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetCategoryQueryKey(category.id) });
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Edit Category</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color Theme</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input type="color" className="w-12 h-10 p-1" {...field} />
                      <Input className="flex-1" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={updateCategory.isPending}>
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
