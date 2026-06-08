import { useState, useRef, useEffect, useCallback } from "react";
import { Block, getListBlocksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Upload, Loader2, Trash2, ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PdfEntry {
  objectPath: string;
  filename: string;
  size: number;
  uploadedAt: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PdfBlock({ block }: { block: Block }) {
  const content = block.content as { pdfs?: PdfEntry[] } | null;
  const [pdfs, setPdfs] = useState<PdfEntry[]>(content?.pdfs ?? []);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const c = block.content as { pdfs?: PdfEntry[] } | null;
    setPdfs(c?.pdfs ?? []);
  }, [block.content]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListBlocksQueryKey(block.instanceId) });
  }, [queryClient, block.instanceId]);

  const uploadFile = useCallback(
    async (file: File) => {
      const isPdf =
        file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        setUploadError("Only PDF files are accepted");
        return;
      }
      setUploadError(null);
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(`/api/blocks/${block.id}/pdfs/upload`, {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: "Upload failed" }));
          throw new Error((err as { error?: string }).error || "Upload failed");
        }
        const newEntry: PdfEntry = await response.json();
        setPdfs((prev) => [...prev, newEntry]);
        invalidate();
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "Upload failed");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [block.id, invalidate],
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await uploadFile(file);
  };

  const handleDelete = async (objectPath: string) => {
    setPdfs((prev) => prev.filter((p) => p.objectPath !== objectPath));
    setConfirmDelete(null);
    try {
      const response = await fetch(`/api/blocks/${block.id}/pdfs`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectPath }),
      });
      if (!response.ok) throw new Error("Delete failed");
      invalidate();
    } catch (err) {
      console.error(err);
      invalidate();
    }
  };

  return (
    <div className="space-y-3">
      {uploadError && (
        <div className="flex items-center justify-between text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {pdfs.length > 0 && (
        <div className="space-y-2">
          {pdfs.map((pdf) => (
            <div
              key={pdf.objectPath}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors group"
            >
              <div className="shrink-0 w-9 h-9 rounded-md bg-red-50 border border-red-100 flex items-center justify-center">
                <FileText className="w-4 h-4 text-red-500" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{pdf.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(pdf.size)} · {formatDate(pdf.uploadedAt)}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={`/api/storage${pdf.objectPath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Open PDF"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {confirmDelete === pdf.objectPath ? (
                  <div className="flex items-center gap-1.5 ml-1">
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(pdf.objectPath)}
                      className="text-xs text-destructive hover:text-destructive/80 transition-colors px-1 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(pdf.objectPath)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete PDF"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        className={cn(
          "rounded-lg border-2 border-dashed transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/40 hover:bg-primary/5",
          isUploading ? "opacity-60 pointer-events-none" : "cursor-pointer",
        )}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
          {isUploading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Uploading…</span>
            </>
          ) : (
            <>
              <Upload className="w-6 h-6" />
              <span className="text-sm font-medium">Drop a PDF here or click to upload</span>
              <span className="text-xs">Up to 50 MB</span>
            </>
          )}
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".pdf,application/pdf"
        className="hidden"
      />
    </div>
  );
}
