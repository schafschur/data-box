import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Block, Photo,
  useListPhotos, useUpdatePhoto, useDeletePhoto,
  getListPhotosQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import {
  Upload, Loader2, X, ZoomIn, ZoomOut,
  ChevronLeft, ChevronRight, CalendarDays, LayoutGrid, Tag, Trash2, RotateCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "calendar" | "categories";

function getPhotoDate(photo: Photo): string {
  return (photo as Photo & { displayDate?: string | null }).displayDate
    ?? photo.createdAt.slice(0, 10);
}

function pad2(n: number) { return String(n).padStart(2, "0"); }
function toDateStr(year: number, month: number, day: number) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}
function monthLabel(year: number, month: number) {
  return new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" });
}

function PhotoThumbnail({
  photo,
  onClick,
  size = "normal",
}: {
  photo: Photo;
  onClick: () => void;
  size?: "normal" | "small";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded bg-muted",
        size === "normal" ? "aspect-square" : "w-8 h-8 rounded-sm flex-shrink-0",
      )}
    >
      <img
        src={`/api/storage${photo.objectPath}?t=${photo.updatedAt}`}
        alt={photo.caption || "Photo"}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    </button>
  );
}

function GridView({
  photos,
  onPhotoClick,
  onUploadClick,
  isUploading,
}: {
  photos: Photo[];
  onPhotoClick: (idx: number) => void;
  onUploadClick: () => void;
  isUploading: boolean;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {photos.map((photo, idx) => (
        <PhotoThumbnail key={photo.id} photo={photo} onClick={() => onPhotoClick(idx)} />
      ))}
      <button
        className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/40 hover:bg-primary/5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
        onClick={onUploadClick}
        disabled={isUploading}
      >
        {isUploading ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          <>
            <Upload className="w-6 h-6" />
            <span className="text-xs font-medium">Upload</span>
          </>
        )}
      </button>
    </div>
  );
}

function CalendarView({
  photos,
  onPhotoClick,
}: {
  photos: Photo[];
  onPhotoClick: (idx: number) => void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const photosByDate = useMemo(() => {
    const map = new Map<string, Photo[]>();
    for (const photo of photos) {
      const d = getPhotoDate(photo);
      map.set(d, [...(map.get(d) ?? []), photo]);
    }
    return map;
  }, [photos]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const cells: Array<{ day: number; dateStr: string } | null> = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dateStr: toDateStr(year, month, d) });
  }

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-1 rounded hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">{monthLabel(year, month)}</span>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-muted transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
          <div key={d} className="text-center text-xs text-muted-foreground py-1">{d}</div>
        ))}
        {cells.map((cell, i) => {
          if (!cell) return <div key={`blank-${i}`} className="min-h-[56px]" />;
          const dayPhotos = photosByDate.get(cell.dateStr) ?? [];
          const isToday = cell.dateStr === todayStr;
          return (
            <div
              key={cell.dateStr}
              className={cn(
                "min-h-[56px] p-1 rounded border text-xs",
                isToday ? "border-primary/40 bg-primary/5" : "border-transparent hover:border-border",
                dayPhotos.length > 0 && "bg-muted/40",
              )}
            >
              <span className={cn("font-medium", isToday && "text-primary")}>{cell.day}</span>
              {dayPhotos.length > 0 && (
                <div className="flex flex-wrap gap-0.5 mt-0.5">
                  {dayPhotos.slice(0, 4).map(photo => {
                    const idx = photos.indexOf(photo);
                    return (
                      <PhotoThumbnail key={photo.id} photo={photo} onClick={() => onPhotoClick(idx)} size="small" />
                    );
                  })}
                  {dayPhotos.length > 4 && (
                    <span className="text-[10px] text-muted-foreground self-end">+{dayPhotos.length - 4}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {photos.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">No photos yet</p>
      )}
    </div>
  );
}

function CategoriesView({
  photos,
  onPhotoClick,
}: {
  photos: Photo[];
  onPhotoClick: (idx: number) => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, Photo[]>();
    for (const photo of photos) {
      const cat = (photo as Photo & { photoCategory?: string | null }).photoCategory ?? "";
      map.set(cat, [...(map.get(cat) ?? []), photo]);
    }
    const named: Array<{ label: string; items: Photo[] }> = [];
    const uncategorized: Photo[] = [];
    for (const [cat, items] of map.entries()) {
      if (cat) named.push({ label: cat, items });
      else uncategorized.push(...items);
    }
    named.sort((a, b) => a.label.localeCompare(b.label));
    if (uncategorized.length > 0) named.push({ label: "Uncategorized", items: uncategorized });
    return named;
  }, [photos]);

  if (photos.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-4">No photos yet</p>;
  }
  if (grouped.length === 1 && grouped[0].label === "Uncategorized") {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Assign categories to photos in the lightbox to group them here.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {photos.map((photo, idx) => (
            <PhotoThumbnail key={photo.id} photo={photo} onClick={() => onPhotoClick(idx)} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {grouped.map(({ label, items }) => (
        <div key={label}>
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-medium">{label}</span>
            <span className="text-xs text-muted-foreground">({items.length})</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {items.map(photo => {
              const idx = photos.indexOf(photo);
              return <PhotoThumbnail key={photo.id} photo={photo} onClick={() => onPhotoClick(idx)} />;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function PhotoLightbox({
  photos,
  initialIdx,
  onClose,
  onUpdate,
}: {
  photos: Photo[];
  initialIdx: number;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [idx, setIdx] = useState(initialIdx);
  const [zoomed, setZoomed] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const updatePhoto = useUpdatePhoto();
  const deletePhoto = useDeletePhoto();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const photo = photos[idx];

  const [caption, setCaption] = useState("");
  const [notes, setNotes] = useState("");
  const [category, setCategory] = useState("");
  const [displayDate, setDisplayDate] = useState("");

  useEffect(() => {
    const p = photos[idx];
    if (!p) return;
    const ext = p as Photo & { notes?: string | null; displayDate?: string | null; photoCategory?: string | null };
    setCaption(p.caption ?? "");
    setNotes(ext.notes ?? "");
    setCategory(ext.photoCategory ?? "");
    setDisplayDate(ext.displayDate ?? p.createdAt.slice(0, 10));
    setZoomed(false);
    setConfirmDelete(false);
  }, [idx, photos]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && idx > 0) setIdx(i => i - 1);
      if (e.key === "ArrowRight" && idx < photos.length - 1) setIdx(i => i + 1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [idx, photos.length, onClose]);

  if (!photo) return null;

  async function handleRotate() {
    setIsRotating(true);
    try {
      const res = await fetch(`/api/photos/${photo.id}/rotate`, { method: "POST" });
      if (!res.ok) throw new Error("Rotate failed");
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRotating(false);
    }
  }

  function save(field: string, value: string) {
    updatePhoto.mutate(
      { id: photo.id, data: { [field]: value.trim() || null } as Record<string, string | null> },
      { onSuccess: onUpdate },
    );
  }

  function handleDelete() {
    deletePhoto.mutate(
      { id: photo.id },
      {
        onSuccess: () => {
          onUpdate();
          if (photos.length <= 1) { onClose(); return; }
          if (idx >= photos.length - 1) setIdx(i => Math.max(0, i - 1));
        },
      },
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: "rgba(0,0,0,0.95)" }}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3">
        <span className="text-white/50 text-sm tabular-nums">{idx + 1} / {photos.length}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRotate}
            disabled={isRotating}
            className="text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
            title="Rotate 90° clockwise"
          >
            {isRotating
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <RotateCw className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setZoomed(z => !z)}
            className="text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            title={zoomed ? "Fit to screen" : "Full size"}
          >
            {zoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
          </button>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Image + nav */}
      <div
        className={cn(
          "flex-1 relative min-h-0",
          zoomed
            ? "overflow-auto flex items-start justify-start"
            : "flex items-center justify-center"
        )}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {idx > 0 && (
          <button
            onClick={() => setIdx(i => i - 1)}
            className="absolute left-3 z-10 p-2.5 bg-black/50 hover:bg-black/75 rounded-full text-white transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {idx < photos.length - 1 && (
          <button
            onClick={() => setIdx(i => i + 1)}
            className="absolute right-3 z-10 p-2.5 bg-black/50 hover:bg-black/75 rounded-full text-white transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
        <img
          src={`/api/storage${photo.objectPath}?t=${photo.updatedAt}`}
          alt={photo.caption || "Photo"}
          className={cn("select-none block", zoomed ? "max-w-none max-h-none" : "max-w-full object-contain")}
          style={zoomed ? {} : { maxHeight: "100%" }}
          draggable={false}
        />
      </div>

      {/* Info panel — hidden when zoomed */}
      <div className={cn("flex-shrink-0 bg-[#0a0a0a] border-t border-white/10 px-6 py-4 overflow-y-auto", zoomed && "hidden")} style={{ maxHeight: 260 }}>
        <div className="max-w-2xl mx-auto">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-white/40 text-[10px] uppercase tracking-widest mb-1 block">Caption</span>
              <input
                className="w-full bg-white/8 text-white text-sm rounded-md px-3 py-1.5 border border-white/15 focus:outline-none focus:border-white/40 placeholder:text-white/25"
                style={{ background: "rgba(255,255,255,0.05)" }}
                value={caption}
                onChange={e => setCaption(e.target.value)}
                onBlur={() => save("caption", caption)}
                onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
                placeholder="Add caption…"
              />
            </label>
            <label className="block">
              <span className="text-white/40 text-[10px] uppercase tracking-widest mb-1 block">Category</span>
              <input
                className="w-full text-white text-sm rounded-md px-3 py-1.5 border border-white/15 focus:outline-none focus:border-white/40 placeholder:text-white/25"
                style={{ background: "rgba(255,255,255,0.05)" }}
                value={category}
                onChange={e => setCategory(e.target.value)}
                onBlur={() => save("photoCategory", category)}
                onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
                placeholder="No category"
              />
            </label>
            <label className="block col-span-2">
              <span className="text-white/40 text-[10px] uppercase tracking-widest mb-1 block">Notes</span>
              <textarea
                className="w-full text-white text-sm rounded-md px-3 py-1.5 border border-white/15 focus:outline-none focus:border-white/40 placeholder:text-white/25 resize-none"
                style={{ background: "rgba(255,255,255,0.05)" }}
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                onBlur={() => save("notes", notes)}
                placeholder="Add notes…"
              />
            </label>
            <label className="block">
              <span className="text-white/40 text-[10px] uppercase tracking-widest mb-1 block">Calendar date</span>
              <input
                type="date"
                className="w-full text-white text-sm rounded-md px-3 py-1.5 border border-white/15 focus:outline-none focus:border-white/40"
                style={{ background: "rgba(255,255,255,0.05)", colorScheme: "dark" }}
                value={displayDate}
                onChange={e => setDisplayDate(e.target.value)}
                onBlur={() => save("displayDate", displayDate)}
              />
            </label>
            <div className="flex items-end justify-end">
              {confirmDelete ? (
                <div className="flex items-center gap-3">
                  <button onClick={() => setConfirmDelete(false)} className="text-white/50 text-sm hover:text-white/80 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-1 text-red-400 text-sm hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Confirm delete
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 text-white/30 hover:text-red-400 text-sm transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete photo
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function PhotoBlock({ block }: { block: Block }) {
  const [view, setView] = useState<ViewMode>("grid");
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: photos = [] } = useListPhotos(block.id, {
    query: { enabled: !!block.id, queryKey: getListPhotosQueryKey(block.id) },
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListPhotosQueryKey(block.id) });
  }, [queryClient, block.id]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/blocks/${block.id}/photos/upload`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }
      invalidate();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const views: Array<{ id: ViewMode; icon: typeof LayoutGrid; label: string }> = [
    { id: "grid", icon: LayoutGrid, label: "Grid" },
    { id: "calendar", icon: CalendarDays, label: "Calendar" },
    { id: "categories", icon: Tag, label: "Categories" },
  ];

  return (
    <div className="space-y-3">
      {uploadError && (
        <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {uploadError}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
          {views.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                view === id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
        {view === "grid" && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Upload
          </Button>
        )}
      </div>

      {/* Content */}
      {view === "grid" && (
        <GridView
          photos={photos}
          onPhotoClick={setLightboxIdx}
          onUploadClick={() => fileInputRef.current?.click()}
          isUploading={isUploading}
        />
      )}
      {view === "calendar" && (
        <CalendarView photos={photos} onPhotoClick={setLightboxIdx} />
      )}
      {view === "categories" && (
        <CategoriesView photos={photos} onPhotoClick={setLightboxIdx} />
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {lightboxIdx !== null && photos.length > 0 && (
        <PhotoLightbox
          photos={photos}
          initialIdx={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onUpdate={invalidate}
        />
      )}
    </div>
  );
}
