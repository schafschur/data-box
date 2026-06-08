import { useState, useRef, useEffect } from "react";
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
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useListContactCards,
  useCreateContactCard,
  useUpdateContactCard,
  useDeleteContactCard,
  useReorderContactCards,
  getListContactCardsQueryKey,
} from "@workspace/api-client-react";
import type { Block, ContactCard, ContactCardInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GripVertical, Plus, Pencil, Trash2, Mail, Phone, X, Check, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  "#4f46e5", "#0891b2", "#16a34a", "#dc2626", "#9333ea",
  "#ea580c", "#0284c7", "#65a30d", "#db2777", "#ca8a04",
  "#7c3aed", "#0e7490", "#15803d", "#b91c1c", "#0369a1",
];

function randomColor(): string {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function textOnColor(hex: string): string {
  return luminance(hex) > 0.35 ? "#1a1a1a" : "#ffffff";
}

function getInitials(first: string, last: string): string {
  return ((first[0] || "") + (last[0] || "")).toUpperCase() || "?";
}

function ContactAvatar({ card }: { card: ContactCard }) {
  if (card.photoPath) {
    return (
      <img
        src={`/api/storage${card.photoPath}`}
        alt={`${card.firstName} ${card.lastName}`}
        className="w-full h-full object-cover"
      />
    );
  }
  const bg = card.color;
  const fg = textOnColor(bg);
  return (
    <span
      className="w-full h-full flex items-center justify-center text-xl font-semibold select-none"
      style={{ backgroundColor: bg, color: fg }}
    >
      {getInitials(card.firstName, card.lastName)}
    </span>
  );
}

interface CardViewProps {
  card: ContactCard;
  onEdit: () => void;
  onDelete: () => void;
  dragAttributes: React.HTMLAttributes<HTMLElement>;
  dragListeners: Record<string, unknown> | undefined;
}

function ContactCardView({ card, onEdit, onDelete, dragAttributes, dragListeners }: CardViewProps) {
  return (
    <div className="group relative bg-card border border-border rounded-xl flex flex-col items-center gap-3 p-5 hover:shadow-md hover:border-primary/20 transition-all">
      <button
        className="absolute top-2 left-2 opacity-0 group-hover:opacity-30 hover:!opacity-60 cursor-grab active:cursor-grabbing touch-none p-0.5 rounded"
        {...(dragAttributes as object)}
        {...(dragListeners as object)}
        type="button"
        tabIndex={-1}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-border">
        <ContactAvatar card={card} />
      </div>

      <div className="text-center w-full">
        <p className="font-semibold leading-tight text-sm">
          {card.firstName} {card.lastName}
        </p>
        {card.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{card.description}</p>
        )}
      </div>

      {(card.email || card.phone) && (
        <div className="w-full space-y-1.5 text-xs border-t border-border pt-2.5">
          {card.email && (
            <a
              href={`mailto:${card.email}`}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground truncate"
              onClick={(e) => e.stopPropagation()}
            >
              <Mail className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{card.email}</span>
            </a>
          )}
          {card.phone && (
            <a
              href={`tel:${card.phone}`}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="h-3 w-3 flex-shrink-0" />
              <span>{card.phone}</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

interface EditFormProps {
  card: ContactCard;
  onSave: (data: ContactCardInput) => void;
  onCancel: () => void;
  isSaving: boolean;
  onRefresh: () => void;
}

function ContactEditForm({ card, onSave, onCancel, isSaving, onRefresh }: EditFormProps) {
  const [firstName, setFirstName] = useState(card.firstName);
  const [lastName, setLastName] = useState(card.lastName);
  const [description, setDescription] = useState(card.description ?? "");
  const [email, setEmail] = useState(card.email ?? "");
  const [phone, setPhone] = useState(card.phone ?? "");
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    card.photoPath ? `/api/storage${card.photoPath}` : null
  );
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [deletePhoto, setDeletePhoto] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    setPendingFile(file);
    setDeletePhoto(false);
  };

  const handleRemovePhoto = () => {
    if (pendingFile) {
      setPendingFile(null);
      setPhotoPreview(card.photoPath ? `/api/storage${card.photoPath}` : null);
    } else {
      setPhotoPreview(null);
      setDeletePhoto(true);
    }
  };

  const handleSave = async () => {
    if (pendingFile) {
      setIsUploadingPhoto(true);
      const formData = new FormData();
      formData.append("file", pendingFile);
      try {
        await fetch(`/api/contact-cards/${card.id}/photo`, { method: "POST", body: formData });
        onRefresh();
      } catch (err) {
        console.error("Photo upload failed:", err);
      }
      setIsUploadingPhoto(false);
    } else if (deletePhoto && card.photoPath) {
      await fetch(`/api/contact-cards/${card.id}/photo`, { method: "DELETE" });
      onRefresh();
    }

    onSave({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      description: description.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      color: card.color,
    });
  };

  const canSave = firstName.trim().length > 0 && lastName.trim().length > 0;
  const avatarInitials = getInitials(firstName || card.firstName, lastName || card.lastName);

  return (
    <div className="bg-card border-2 border-primary/25 rounded-xl p-4 space-y-3">
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-border">
            {photoPreview ? (
              <img src={photoPreview} className="w-full h-full object-cover" alt="preview" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-xl font-semibold select-none"
                style={{ backgroundColor: card.color, color: textOnColor(card.color) }}
              >
                {avatarInitials}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm"
            title="Upload photo"
          >
            <Camera className="h-3 w-3" />
          </button>
          {photoPreview && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm"
              title="Remove photo"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First name"
          className="h-8 text-sm"
          autoFocus
        />
        <Input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Last name"
          className="h-8 text-sm"
        />
      </div>

      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Short description"
        className="resize-none h-16 min-h-0 text-sm"
      />
      <Input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        type="email"
        className="h-8 text-sm"
      />
      <Input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone"
        className="h-8 text-sm"
      />

      <div className="flex gap-2 justify-end pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-7 px-2 text-muted-foreground"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!canSave || isSaving || isUploadingPhoto}
          className="h-7 px-3"
        >
          <Check className="h-3.5 w-3.5 mr-1" />
          Save
        </Button>
      </div>
    </div>
  );
}

interface AddFormProps {
  onSave: (data: ContactCardInput) => void;
  onCancel: () => void;
  isSaving: boolean;
}

function AddContactForm({ onSave, onCancel, isSaving }: AddFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const canSave = firstName.trim().length > 0 && lastName.trim().length > 0;

  return (
    <div className="bg-card border-2 border-dashed border-primary/25 rounded-xl p-4 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">New Contact</p>
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First name *"
          className="h-8 text-sm"
          autoFocus
        />
        <Input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Last name *"
          className="h-8 text-sm"
        />
      </div>
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Short description"
        className="resize-none h-14 min-h-0 text-sm"
      />
      <Input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        type="email"
        className="h-8 text-sm"
      />
      <Input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone"
        className="h-8 text-sm"
      />
      <div className="flex gap-2 justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-7 px-2 text-muted-foreground"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() =>
            onSave({
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              description: description.trim() || null,
              email: email.trim() || null,
              phone: phone.trim() || null,
              color: randomColor(),
            })
          }
          disabled={!canSave || isSaving}
          className="h-7 px-3"
        >
          <Check className="h-3.5 w-3.5 mr-1" />
          Add
        </Button>
      </div>
    </div>
  );
}

interface SortableCardProps {
  card: ContactCard;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (data: ContactCardInput) => void;
  onDelete: () => void;
  isSaving: boolean;
  onRefresh: () => void;
}

function SortableCard({
  card,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  isSaving,
  onRefresh,
}: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "opacity-50 z-50 relative")}
    >
      {isEditing ? (
        <ContactEditForm
          card={card}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
          isSaving={isSaving}
          onRefresh={onRefresh}
        />
      ) : (
        <ContactCardView
          card={card}
          onEdit={onStartEdit}
          onDelete={onDelete}
          dragAttributes={attributes as React.HTMLAttributes<HTMLElement>}
          dragListeners={listeners}
        />
      )}
    </div>
  );
}

const COL_CLASSES: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

export function ContactBlock({ block }: { block: Block }) {
  const queryClient = useQueryClient();
  const storageKey = `contact-block-cols-${block.id}`;

  const [userCols, setUserCols] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem(storageKey) || "2") || 2;
    } catch {
      return 2;
    }
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const { data: cards = [] } = useListContactCards(block.id);
  const [sortedCards, setSortedCards] = useState<ContactCard[]>([]);

  useEffect(() => {
    setSortedCards(cards as ContactCard[]);
  }, [cards]);

  const createCard = useCreateContactCard();
  const updateCard = useUpdateContactCard();
  const deleteCard = useDeleteContactCard();
  const reorderCards = useReorderContactCards();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListContactCardsQueryKey(block.id) });

  const setColumns = (n: number) => {
    setUserCols(n);
    try {
      localStorage.setItem(storageKey, String(n));
    } catch {}
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortedCards.findIndex((c) => c.id === active.id);
    const newIndex = sortedCards.findIndex((c) => c.id === over.id);
    const newOrder = arrayMove(sortedCards, oldIndex, newIndex);
    setSortedCards(newOrder);
    reorderCards.mutate(
      { blockId: block.id, data: { ids: newOrder.map((c) => c.id) } },
      { onError: () => setSortedCards(cards as ContactCard[]) }
    );
  };

  const colClass = COL_CLASSES[userCols] ?? COL_CLASSES[2];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-1">
        <span className="text-xs text-muted-foreground mr-1">Cols:</span>
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setColumns(n)}
            className={cn(
              "w-7 h-7 text-xs rounded flex items-center justify-center border transition-colors",
              userCols === n
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            {n}
          </button>
        ))}
      </div>

      {sortedCards.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedCards.map((c) => c.id)}
            strategy={rectSortingStrategy}
          >
            <div className={cn("grid gap-4", colClass)}>
              {sortedCards.map((card) => (
                <SortableCard
                  key={card.id}
                  card={card}
                  isEditing={editingId === card.id}
                  onStartEdit={() => {
                    setEditingId(card.id);
                    setIsAdding(false);
                  }}
                  onCancelEdit={() => setEditingId(null)}
                  onSaveEdit={(data) => {
                    updateCard.mutate(
                      { id: card.id, data },
                      {
                        onSuccess: () => {
                          invalidate();
                          setEditingId(null);
                        },
                      }
                    );
                  }}
                  onDelete={() => {
                    if (!window.confirm("Delete this contact?")) return;
                    deleteCard.mutate(
                      { id: card.id },
                      { onSuccess: invalidate }
                    );
                  }}
                  isSaving={updateCard.isPending}
                  onRefresh={invalidate}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {isAdding ? (
        <AddContactForm
          onSave={(data) => {
            createCard.mutate(
              { blockId: block.id, data },
              {
                onSuccess: () => {
                  invalidate();
                  setIsAdding(false);
                },
              }
            );
          }}
          onCancel={() => setIsAdding(false)}
          isSaving={createCard.isPending}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
          }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-primary/40 rounded-lg px-4 py-3 w-full transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Contact
        </button>
      )}
    </div>
  );
}
