import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Block {
  id: number;
  title: string | null;
  type: string;
}

interface ExportBlocksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blocks: Block[];
  exportUrl: string;
}

function blockLabel(block: Block): string {
  if (block.title) return block.title;
  const type = block.type.charAt(0).toUpperCase() + block.type.slice(1);
  return `Untitled ${type}`;
}

export function ExportBlocksDialog({ open, onOpenChange, blocks, exportUrl }: ExportBlocksDialogProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (open) {
      setSelected(new Set(blocks.map((b) => b.id)));
    }
  }, [open, blocks]);

  const allSelected = blocks.length > 0 && selected.size === blocks.length;
  const noneSelected = selected.size === 0;

  function toggleBlock(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(blocks.map((b) => b.id)));
    }
  }

  function handleExport() {
    const ids = Array.from(selected);
    const url = ids.length === blocks.length
      ? exportUrl
      : `${exportUrl}?blockIds=${ids.join(",")}`;
    window.open(url);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export as PDF</DialogTitle>
          <DialogDescription>
            Choose which blocks to include in the export.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No blocks to export.</p>
          ) : (
            <>
              <div className="flex items-center gap-2 pb-2 border-b mb-2">
                <Checkbox
                  id="select-all"
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                />
                <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer select-none">
                  {allSelected ? "Deselect all" : "Select all"}
                </Label>
              </div>
              {blocks.map((block) => (
                <div key={block.id} className="flex items-center gap-2 py-1 rounded hover:bg-muted/50 px-1">
                  <Checkbox
                    id={`block-${block.id}`}
                    checked={selected.has(block.id)}
                    onCheckedChange={() => toggleBlock(block.id)}
                  />
                  <Label htmlFor={`block-${block.id}`} className="text-sm cursor-pointer select-none flex-1 min-w-0">
                    <span className="truncate block">{blockLabel(block)}</span>
                  </Label>
                  <span className="text-xs text-muted-foreground capitalize shrink-0">{block.type}</span>
                </div>
              ))}
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={noneSelected}>
            <Download className="w-4 h-4 mr-2" />
            Export {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
