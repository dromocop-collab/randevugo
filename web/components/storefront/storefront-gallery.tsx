"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Images, Maximize2, X } from "lucide-react";
import { useT } from "@/i18n/client";

interface Props { galleryUrls: string[]; businessName: string }

export function StorefrontGallery({ galleryUrls, businessName }: Props) {
  const t = useT();
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
      <header><span><Images size={19}/></span><div><small>{t("MEKÂNI KEŞFEDİN")}</small><h2>{t("Mağazadan kareler.")}</h2></div><b>{t("{count} görsel", { count: galleryUrls.length })}</b></header>
      <div className="storefront-gallery-grid">
        {galleryUrls.map((url, index) => <button type="button" key={url} className={index === 0 ? "featured" : ""} onClick={() => setActiveIndex(index)} aria-label={t("{name} galeri görseli {index}", { name: businessName, index: index + 1 })}>
          <Image src={url} alt={`${businessName} - ${index + 1}`} fill sizes={index === 0 ? "(max-width: 760px) 100vw, 60vw" : "(max-width: 760px) 50vw, 30vw"} className="object-cover"/><span><Maximize2 size={16}/> {t("Büyüt")}</span>
        </button>)}
      </div>
    </section>
    {activeIndex !== null && <div className="storefront-lightbox" role="dialog" aria-modal="true" aria-label={t("Galeri görüntüleyici")} onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveIndex(null); }}>
      <button className="lightbox-close" onClick={() => setActiveIndex(null)} aria-label={t("Galeriyi kapat")}><X size={21}/></button>
      {galleryUrls.length > 1 && <button className="lightbox-prev" onClick={() => setActiveIndex((activeIndex - 1 + galleryUrls.length) % galleryUrls.length)} aria-label={t("Önceki görsel")}><ChevronLeft/></button>}
      <figure className="relative"><Image src={galleryUrls[activeIndex]} alt={t("{name} büyük galeri görseli", { name: businessName })} width={1400} height={1000} className="max-h-[85vh] w-auto object-contain"/><figcaption>{activeIndex + 1} / {galleryUrls.length}</figcaption></figure>
      {galleryUrls.length > 1 && <button className="lightbox-next" onClick={() => setActiveIndex((activeIndex + 1) % galleryUrls.length)} aria-label={t("Sonraki görsel")}><ChevronRight/></button>}
    </div>}
  </>;
}
