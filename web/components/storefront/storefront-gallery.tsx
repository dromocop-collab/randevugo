"use client";

interface Props {
  galleryUrls: string[];
  businessName: string;
}

export function StorefrontGallery({ galleryUrls, businessName }: Props) {
  if (galleryUrls.length === 0) return null;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-lg shadow-[var(--shadow-soft)] backdrop-blur-xl">
      <h2 className="text-lg font-semibold text-[var(--text-1)]">Galeri</h2>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {galleryUrls.map((url, index) => (
          <div
            key={url}
            className="aspect-square overflow-hidden rounded-xl"
          >
            <img
              src={url}
              alt={`${businessName} - ${index + 1}`}
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
