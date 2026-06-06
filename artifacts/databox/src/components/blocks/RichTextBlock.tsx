import { useState, useRef, useEffect } from "react";
import { Block, useUpdateBlock } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X } from "lucide-react";

export function RichTextBlock({ block }: { block: Block }) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(block.content || "");
  const updateBlock = useUpdateBlock();
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    updateBlock.mutate({ id: block.id, data: { content } });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setContent(block.content || "");
    setIsEditing(false);
  };

  return (
    <div className="group">
      {isEditing ? (
        <div className="space-y-3">
          <Textarea 
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[200px] font-sans text-base leading-relaxed bg-background/50 border-primary/20 focus-visible:ring-primary/30"
            placeholder="Start typing..."
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={updateBlock.isPending}>
              <Check className="w-4 h-4 mr-1" /> Save
            </Button>
          </div>
        </div>
      ) : (
        <div 
          onClick={() => setIsEditing(true)}
          className="prose prose-stone dark:prose-invert max-w-none cursor-text min-h-[100px] p-4 rounded-lg hover:bg-muted/30 transition-colors empty:before:content-['Click_to_add_content...'] empty:before:text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: block.content || "" }}
        />
      )}
    </div>
  );
}
