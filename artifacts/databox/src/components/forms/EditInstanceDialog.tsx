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
import { useUpdateInstance, getGetInstanceQueryKey, getListInstancesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

export function EditInstanceDialog({ 
  open, 
  onOpenChange, 
  instance 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  instance: { id: number; categoryId: number; name: string; description?: string | null; };
}) {
  const queryClient = useQueryClient();
  const updateInstance = useUpdateInstance();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: instance.name,
      description: instance.description || "",
    },
  });

  useEffect(() => {
    form.reset({
      name: instance.name,
      description: instance.description || "",
    });
  }, [instance, form]);

  const onSubmit = (data: z.infer<typeof schema>) => {
    updateInstance.mutate(
      { id: instance.id, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetInstanceQueryKey(instance.id) });
          queryClient.invalidateQueries({ queryKey: getListInstancesQueryKey(instance.categoryId) });
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Edit Instance</DialogTitle>
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
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={updateInstance.isPending}>
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
