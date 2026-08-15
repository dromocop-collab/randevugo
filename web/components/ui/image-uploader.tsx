"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

interface ImageUploaderProps {
  /** Current image URL (if any) */
  currentUrl?: string;
  /** Callback with the download URL after successful upload */
  onUpload: (url: string) => void;
  /** Upload handler — receives the File, returns download URL */
  uploadFn: (file: File) => Promise<string>;
  /** Label shown above the uploader */
  label: string;
  /** Shape: "square" for logo, "wide" for cover */
  shape?: "square" | "wide";
  /** Accepted file types */
  accept?: string;
}

export function ImageUploader({
  currentUrl,
  onUpload,
  uploadFn,
  label,
  shape = "square",
  accept = "image/png,image/jpeg,image/webp",
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const displayUrl = preview ?? currentUrl;

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Sadece resim dosyaları yüklenebilir.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Dosya boyutu 5MB'dan küçük olmalıdır.");
      return;
    }

    // Instant preview
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);

    setUploading(true);
    try {
      const url = await uploadFn(file);
      onUpload(url);
      toast.success(`${label} yüklendi.`);
    } catch {
      toast.error(`${label} yüklenemedi.`);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-[var(--text-2)]">{label}</p>
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={`group relative flex cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 ${
          displayUrl
            ? "border-[var(--accent)]/30"
            : "border-[var(--border)] bg-[var(--surface-2)]"
        } ${shape === "wide" ? "h-36 w-full" : "h-32 w-32"}`}
      >
        {displayUrl ? (
          <>
            <img
              src={displayUrl}
              alt={label}
              className={`h-full w-full object-cover ${shape === "square" ? "rounded-2xl" : ""}`}
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 opacity-0 transition group-hover:opacity-100">
              <span className="text-xs font-medium text-white">Değiştir</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 p-4 text-center">
            {uploading ? (
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            ) : (
              <>
                <svg className="h-6 w-6 text-[var(--text-3)] transition group-hover:text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span className="text-[10px] text-[var(--text-3)] group-hover:text-[var(--accent)]">
                  Yükle veya sürükle
                </span>
              </>
            )}
          </div>
        )}

        {/* Uploading overlay */}
        {uploading && displayUrl && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      <p className="mt-1 text-[10px] text-[var(--text-3)]">
        PNG, JPEG veya WebP · Maks. 5MB
      </p>
    </div>
  );
}
