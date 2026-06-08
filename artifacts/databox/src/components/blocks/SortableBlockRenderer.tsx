import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Block } from "@workspace/api-client-react";
import { BlockRenderer } from "./BlockRenderer";

export function SortableBlockRenderer({ block }: { block: Block }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: "relative",
    zIndex: isDragging ? 1 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} id={`block-${block.id}`}>
      <BlockRenderer
        block={block}
        dragHandleRef={setActivatorNodeRef}
        dragHandleAttributes={attributes}
        dragHandleListeners={listeners}
      />
    </div>
  );
}
