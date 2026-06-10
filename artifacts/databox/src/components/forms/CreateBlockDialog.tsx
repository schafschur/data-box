import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useCreateBlock, getListBlocksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const schema = z.object({
  title: z.string().optional(),
  type: z.enum(["richtext", "todo", "calendar", "photo", "pdf", "contact", "list", "grid"]),
}).superRefine((data, ctx) => {
  if (data.type === "photo" && !data.title?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Category name is required for photo blocks",
      path: ["title"],
    });
  }
});

export function CreateBlockDialog({ instanceId }: { instanceId: number }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const createBlock = useCreateBlock();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      type: "richtext",
    },
  });

  const selectedType = useWatch({ control: form.control, name: "type" });
  const isPhoto = selectedType === "photo";
  const isPdf = selectedType === "pdf";
  const isContact = selectedType === "contact";
  const isList = selectedType === "list";
  const isGrid = selectedType === "grid";

  const onSubmit = (data: z.infer<typeof schema>) => {
    createBlock.mutate(
      { instanceId, data },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListBlocksQueryKey(instanceId) });
          setOpen(false);
          form.reset();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Block
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Add Block</DialogTitle>
          <DialogDescription>
            {isPhoto
              ? "Each photo block is a category. Photos you upload will be tagged with this category automatically."
              : isPdf
              ? "Upload and manage PDF files in this block."
              : isContact
              ? "Store and manage contact cards with photos, email, and phone."
              : isList
              ? "A structured list of items, each with a title, description, and notes."
              : isGrid
              ? "A 7-column weekly data grid. Add rows, label them, and fill in numeric values per day."
              : "Add a new section to your instance."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select
                    onValueChange={(val) => {
                      field.onChange(val);
                      form.setValue("title", "");
                      form.clearErrors("title");
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a block type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="richtext">Rich Text</SelectItem>
                      <SelectItem value="todo">Todo List</SelectItem>
                      <SelectItem value="calendar">Calendar</SelectItem>
                      <SelectItem value="photo">Photos</SelectItem>
                      <SelectItem value="pdf">PDF Files</SelectItem>
                      <SelectItem value="contact">Contacts</SelectItem>
                      <SelectItem value="list">List</SelectItem>
                      <SelectItem value="grid">Weekly Grid</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {isPhoto ? "Category Name" : "Title"}
                    {!isPhoto && <span className="text-muted-foreground font-normal ml-1">(Optional)</span>}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={isPhoto ? "e.g. Vacation, Work, Family…" : isPdf ? "e.g. Contracts, Reports…" : "Block title"}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={createBlock.isPending}>
                {isPhoto ? "Create Photo Block" : isPdf ? "Create PDF Block" : isContact ? "Create Contacts Block" : isGrid ? "Create Grid Block" : "Create Block"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
