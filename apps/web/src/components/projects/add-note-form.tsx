import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ImagePlus, X, Loader2 } from 'lucide-react';

const MAX_FILES = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];

interface AddNoteFormProps {
  projectId: string;
  onSubmit: (dto: { content: string; photoUrls: string[] }) => Promise<void>;
  uploadPhoto: (projectId: string, file: File) => Promise<string>;
}

interface PendingPhoto {
  file: File;
  previewUrl: string;
  uploadedUrl?: string;
  uploading: boolean;
  error?: string;
}

export function AddNoteForm({ projectId, onSubmit, uploadPhoto }: AddNoteFormProps) {
  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArr = Array.from(files);
      const remaining = MAX_FILES - photos.length;
      if (remaining <= 0) return;

      const toAdd = fileArr.slice(0, remaining).filter((f) =>
        ALLOWED_TYPES.includes(f.type.toLowerCase())
      );

      const pending: PendingPhoto[] = toAdd.map((f) => ({
        file: f,
        previewUrl: URL.createObjectURL(f),
        uploading: true,
      }));

      setPhotos((prev) => [...prev, ...pending]);

      // Upload each file immediately
      for (const p of pending) {
        try {
          const url = await uploadPhoto(projectId, p.file);
          setPhotos((prev) =>
            prev.map((x) =>
              x.previewUrl === p.previewUrl
                ? { ...x, uploadedUrl: url, uploading: false }
                : x
            )
          );
        } catch {
          setPhotos((prev) =>
            prev.map((x) =>
              x.previewUrl === p.previewUrl
                ? { ...x, uploading: false, error: 'Upload failed' }
                : x
            )
          );
        }
      }
    },
    [photos.length, projectId, uploadPhoto]
  );

  function removePhoto(previewUrl: string) {
    setPhotos((prev) => {
      const removed = prev.find((p) => p.previewUrl === previewUrl);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((p) => p.previewUrl !== previewUrl);
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  }

  async function handleSubmit() {
    if (!content.trim()) return;
    const stillUploading = photos.some((p) => p.uploading);
    if (stillUploading) return;

    const photoUrls = photos
      .filter((p) => p.uploadedUrl != null)
      .map((p) => p.uploadedUrl!);

    setSubmitting(true);
    try {
      await onSubmit({ content: content.trim(), photoUrls });
      setContent('');
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPhotos([]);
    } finally {
      setSubmitting(false);
    }
  }

  const anyUploading = photos.some((p) => p.uploading);

  return (
    <div className="space-y-3">
      <Textarea
        placeholder="Add a note…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="resize-none"
      />

      {/* Photo thumbnails */}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((p) => (
            <div key={p.previewUrl} className="relative w-16 h-16 rounded-md overflow-hidden border border-border">
              <img
                src={p.previewUrl}
                alt="preview"
                className="w-full h-full object-cover"
              />
              {p.uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 text-white animate-spin" />
                </div>
              )}
              {p.error && (
                <div className="absolute inset-0 bg-red-900/70 flex items-center justify-center">
                  <span className="text-white text-xs px-1 text-center">{p.error}</span>
                </div>
              )}
              <button
                type="button"
                className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
                onClick={() => removePhoto(p.previewUrl)}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone hint when no photos yet */}
      {photos.length === 0 && (
        <div
          className="border-2 border-dashed border-border rounded-md p-4 text-center text-sm text-muted-foreground cursor-pointer hover:border-muted-foreground/50 transition-colors"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="h-5 w-5 mx-auto mb-1 opacity-50" />
          Drop photos here or click to select (JPEG, PNG, HEIC — max 5)
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/heif"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && addFiles(e.target.files)}
      />

      <div className="flex items-center justify-between">
        {photos.length > 0 && photos.length < MAX_FILES && (
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4 mr-1" />
            Add more ({MAX_FILES - photos.length} left)
          </Button>
        )}
        {photos.length === 0 && <span />}
        <Button
          onClick={handleSubmit}
          disabled={!content.trim() || submitting || anyUploading}
          size="sm"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Saving…
            </>
          ) : anyUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Uploading…
            </>
          ) : (
            'Add Note'
          )}
        </Button>
      </div>
    </div>
  );
}
