"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Images, Maximize2, X } from "lucide-react";

interface Props { galleryUrls: string[]; businessName: string }

export function StorefrontGallery({ galleryUrls, businessName }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    if (activeIndex === null) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowRight") setActiveIndex((index) => index === null ? null : (index + 1) % galleryUrls.length);
      if (event.key === "ArrowLeft") setActiveIndex((index) => index === null ? null : (index - 1 + galleryUrls.length) % galleryUrls.length);
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [activeIndex, galleryUrls.length]);

  if (galleryUrls.length === 0) return null;

  return <>
    <section className="storefront-gallery-section">
      <header><span><Images size={19}/></span><div><small>MEKÂNI KEŞFEDİN</small><h2>Mağazadan kareler.</h2></div><b>{galleryUrls.length} görsel</b></header>
      <div className="storefront-gallery-grid">
        {galleryUrls.map((url, index) => <button type="button" key={url} className={index === 0 ? "featured" : ""} onClick={() => setActiveIndex(index)} aria-label={`${businessName} galeri görseli ${index + 1}`}>
          <img src={url} alt={`${businessName} - ${index + 1}`}/><span><Maximize2 size={16}/> Büyüt</span>
        </button>)}
      </div>
    </section>
    {activeIndex !== null && <div className="storefront-lightbox" role="dialog" aria-modal="true" aria-label="Galeri görüntüleyici" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveIndex(null); }}>
      <button className="lightbox-close" onClick={() => setActiveIndex(null)} aria-label="Galeriyi kapat"><X size={21}/></button>
      {galleryUrls.length > 1 && <button className="lightbox-prev" onClick={() => setActiveIndex((activeIndex - 1 + galleryUrls.length) % galleryUrls.length)} aria-label="Önceki görsel"><ChevronLeft/></button>}
      <figure><img src={galleryUrls[activeIndex]} alt={`${businessName} büyük galeri görseli`}/><figcaption>{activeIndex + 1} / {galleryUrls.length}</figcaption></figure>
      {galleryUrls.length > 1 && <button className="lightbox-next" onClick={() => setActiveIndex((activeIndex + 1) % galleryUrls.length)} aria-label="Sonraki görsel"><ChevronRight/></button>}
    </div>}
  </>;
}
