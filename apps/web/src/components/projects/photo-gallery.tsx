import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PhotoGalleryProps {
  urls: string[];
  altPrefix?: string;
}

export function PhotoGallery({ urls, altPrefix = 'Photo' }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (urls.length === 0) return null;

  const apiBase = import.meta.env.VITE_API_URL || '';

  function fullUrl(url: string) {
    // If it's already absolute (starts with http/https), use as-is
    if (url.startsWith('http')) return url;
    return `${apiBase}${url}`;
  }

  function prev() {
    if (lightboxIndex == null) return;
    setLightboxIndex((lightboxIndex - 1 + urls.length) % urls.length);
  }

  function next() {
    if (lightboxIndex == null) return;
    setLightboxIndex((lightboxIndex + 1) % urls.length);
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-2">
        {urls.map((url, i) => (
          <button
            key={url}
            type="button"
            className="w-16 h-16 rounded-md overflow-hidden border border-border hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring"
            onClick={() => setLightboxIndex(i)}
          >
            <img
              src={fullUrl(url)}
              alt={`${altPrefix} ${i + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {lightboxIndex != null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={fullUrl(urls[lightboxIndex])}
              alt={`${altPrefix} ${lightboxIndex + 1}`}
              className="w-full h-full object-contain max-h-[80vh] rounded-lg"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-white hover:bg-white/20"
              onClick={() => setLightboxIndex(null)}
            >
              <X className="h-5 w-5" />
            </Button>
            {urls.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                  onClick={prev}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-10 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
                  onClick={next}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white text-sm bg-black/40 px-3 py-1 rounded-full">
                  {lightboxIndex + 1} / {urls.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
