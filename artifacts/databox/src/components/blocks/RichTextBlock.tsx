import { useState, useRef, useEffect, useCallback } from "react";
import { Block, useUpdateBlock } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Check, X, Bold, Italic, Underline, List, ListOrdered, Heading2, Heading3, Quote } from "lucide-react";
import DOMPurify from "dompurify";

const sanitize = (html: string) =>
  DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "strong", "i", "em", "u", "h2", "h3", "p", "br", "ul", "ol", "li", "blockquote", "div", "span"],
    ALLOWED_ATTR: [],
  });

type ToolbarAction = {
  icon: React.ReactNode;
  label: string;
  command: string;
  value?: string;
};

const TOOLBAR: ToolbarAction[] = [
  { icon: <Bold className="h-3.5 w-3.5" />, label: "Bold", command: "bold" },
  { icon: <Italic className="h-3.5 w-3.5" />, label: "Italic", command: "italic" },
  { icon: <Underline className="h-3.5 w-3.5" />, label: "Underline", command: "underline" },
  { icon: <Heading2 className="h-3.5 w-3.5" />, label: "H2", command: "formatBlock", value: "h2" },
  { icon: <Heading3 className="h-3.5 w-3.5" />, label: "H3", command: "formatBlock", value: "h3" },
  { icon: <List className="h-3.5 w-3.5" />, label: "Bullet list", command: "insertUnorderedList" },
  { icon: <ListOrdered className="h-3.5 w-3.5" />, label: "Numbered list", command: "insertOrderedList" },
  { icon: <Quote className="h-3.5 w-3.5" />, label: "Quote", command: "formatBlock", value: "blockquote" },
];

export function RichTextBlock({ block }: { block: Block }) {
  const [isEditing, setIsEditing] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const savedContent = useRef(block.content || "");
  const updateBlock = useUpdateBlock();

  useEffect(() => {
    savedContent.current = block.content || "";
  }, [block.content]);

  const startEditing = () => {
    setIsEditing(true);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = sanitize(savedContent.current);
        editorRef.current.focus();
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }, 0);
  };

  const handleSave = () => {
    const html = sanitize(editorRef.current?.innerHTML || "");
    savedContent.current = html;
    updateBlock.mutate({ id: block.id, data: { content: html } });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const execFormat = useCallback((command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") handleCancel();
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "b") { e.preventDefault(); execFormat("bold"); }
    if ((e.ctrlKey || e.metaKey) && e.key === "i") { e.preventDefault(); execFormat("italic"); }
    if ((e.ctrlKey || e.metaKey) && e.key === "u") { e.preventDefault(); execFormat("underline"); }
  };

  const displayHtml = sanitize(savedContent.current || block.content || "");

  return (
    <div className="group">
      {isEditing ? (
        <div className="space-y-2 border border-primary/20 rounded-lg overflow-hidden shadow-sm">
          <div className="flex flex-wrap items-center gap-0.5 px-3 pt-3 pb-2 border-b border-border/50 bg-muted/30">
            {TOOLBAR.map((action) => (
              <button
                key={action.label}
                title={action.label}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  execFormat(action.command, action.value);
                }}
                className="p-1.5 rounded hover:bg-background hover:shadow-sm transition-all text-muted-foreground hover:text-foreground"
              >
                {action.icon}
              </button>
            ))}
            <div className="flex-1" />
            <span className="text-[10px] text-muted-foreground/60 px-1">⌘S to save · Esc to cancel</span>
          </div>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onKeyDown={handleKeyDown}
            className="min-h-[200px] px-5 py-4 text-base leading-relaxed outline-none prose prose-stone dark:prose-invert max-w-none focus:outline-none [&_h2]:text-xl [&_h2]:font-serif [&_h3]:text-lg [&_h3]:font-serif [&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground"
          />
          <div className="flex justify-end gap-2 px-4 pb-3">
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
          onClick={startEditing}
          className="cursor-text min-h-[80px] p-4 rounded-lg hover:bg-muted/30 transition-colors prose prose-stone dark:prose-invert max-w-none [&_h2]:text-xl [&_h2]:font-serif [&_h3]:text-lg [&_h3]:font-serif [&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: displayHtml || "<p class='text-muted-foreground text-sm'>Click to add content…</p>" }}
        />
      )}
    </div>
  );
}
