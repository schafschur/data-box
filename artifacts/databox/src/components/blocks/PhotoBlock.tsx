import { useState, useRef } from "react";
import { Block, useListPhotos, useAddPhoto, useDeletePhoto, useUpdatePhoto, useRequestUploadUrl, getListPhotosQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Trash2, Upload, Loader2, Edit2, Check, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";

export function PhotoBlock({ block }: { block: Block }) {
  const [isUploading, setIsUploading] = useState(false);
  const [editingCaptionId, setEditingCaptionId] = useState<number | null>(null);
  const [captionText, setCaptionText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: photos = [] } = useListPhotos(block.id, {
    query: { enabled: !!block.id, queryKey: getListPhotosQueryKey(block.id) }
  });

  const requestUploadUrl = useRequestUploadUrl();
  const addPhoto = useAddPhoto();
  const updatePhoto = useUpdatePhoto();
  const deletePhoto = useDeletePhoto();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      // 1. Get presigned URL
      const { uploadURL, objectPath } = await requestUploadUrl.mutateAsync({
        data: {
          name: file.name,
          size: file.size,
          contentType: file.type,
        }
      });

      // 2. Upload to GCS directly
      await fetch(uploadURL, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      // 3. Save reference in DB
      await addPhoto.mutateAsync({
        blockId: block.id,
        data: { objectPath },
      });

      queryClient.invalidateQueries({ queryKey: getListPhotosQueryKey(block.id) });
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this photo?")) {
      deletePhoto.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListPhotosQueryKey(block.id) });
          }
        }
      );
    }
  };

  const startEditCaption = (photo: any) => {
    setEditingCaptionId(photo.id);
    setCaptionText(photo.caption || "");
  };

  const saveCaption = (id: number) => {
    updatePhoto.mutate(
      { id, data: { caption: captionText } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPhotosQueryKey(block.id) });
          setEditingCaptionId(null);
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {photos.map((photo) => (
          <div key={photo.id} className="group relative aspect-square rounded-lg overflow-hidden bg-muted">
            <img 
              src={`/api/storage${photo.objectPath}`} 
              alt={photo.caption || "Photo"} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <Button 
                variant="secondary" 
                size="icon" 
                className="h-8 w-8 rounded-full shadow-sm bg-background/80 hover:bg-background"
                onClick={() => startEditCaption(photo)}
              >
                <Edit2 className="h-4 w-4 text-foreground" />
              </Button>
              <Button 
                variant="destructive" 
                size="icon" 
                className="h-8 w-8 rounded-full shadow-sm"
                onClick={() => handleDelete(photo.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            
            {(photo.caption || editingCaptionId === photo.id) && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 z-10">
                {editingCaptionId === photo.id ? (
                  <div className="flex items-center gap-1">
                    <Input 
                      value={captionText}
                      onChange={(e) => setCaptionText(e.target.value)}
                      className="h-7 text-xs bg-background/90 text-foreground border-none"
                      placeholder="Add caption..."
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveCaption(photo.id);
                        if (e.key === 'Escape') setEditingCaptionId(null);
                      }}
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-white" onClick={() => saveCaption(photo.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-white text-xs truncate">
                    {photo.caption}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        
        <button 
          className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-all cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : (
            <>
              <Upload className="w-8 h-8" />
              <span className="text-sm font-medium">Upload Photo</span>
            </>
          )}
        </button>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        accept="image/*"
        capture="environment"
        className="hidden" 
      />
    </div>
  );
}
