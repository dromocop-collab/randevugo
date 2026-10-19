"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Check, Copy, Download, ExternalLink, LoaderCircle, RotateCcw, Share2, X } from "lucide-react";
import { InstagramGlyph } from "./instagram-glyph";
import { shareFileName, shareImagePath, type ShareFormat } from "./instagram-share-domain";
import styles from "./instagram-share-sheet.module.css";
import { useT } from "@/i18n/client";
import { tk } from "@/i18n/config";

type Props = {
  open: boolean;
  onClose: () => void;
  slug: string;
  businessName: string;
  /** İşletmenin updatedAt'i: değişince görsel adresi (ve CDN önbelleği) yenilenir. */
  version?: unknown;
};

type FileState = { status: "loading" } | { status: "ready"; file: File; url: string } | { status: "error" };

const FORMATS: { format: ShareFormat; label: string; action: string; ratio: string }[] = [
  { format: "story", label: tk("Hikâye · 9:16"), action: tk("Hikâyede paylaş"), ratio: "9 / 16" },
  { format: "post", label: tk("Gönderi · 4:5"), action: tk("Gönderi olarak paylaş"), ratio: "4 / 5" },
];

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function detectPlatform(): "ios" | "android" | "desktop" {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function canShareFile(file: File): boolean {
  try {
    return typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

/**
 * İşletme vitrini için Instagram paylaşım penceresi: Hikâye/Gönderi görselinin önizlemesi,
 * Web Share (dosya) destekleyen telefonlarda doğrudan paylaşım, diğerlerinde indirme + adımlar.
 */
export function InstagramShareSheet(props: Props) {
  if (!props.open || typeof document === "undefined") return null;
  return createPortal(<SheetBody {...props} />, document.body);
}

function SheetBody({ onClose, slug, businessName, version }: Props) {
  const t = useT();
  const [files, setFiles] = useState<Record<ShareFormat, FileState>>({ story: { status: "loading" }, post: { status: "loading" } });
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState<ShareFormat | null>(null);
  const [done, setDone] = useState<ShareFormat | null>(null);
  const [copied, setCopied] = useState(false);
  const [platform] = useState(detectPlatform);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pending = useRef<Partial<Record<ShareFormat, Promise<File | null>>>>({});
  const objectUrls = useRef<string[]>([]);

  const pageUrl = `${window.location.origin}/isletme/${encodeURIComponent(decodeURIComponentSafe(slug))}`;
  const srcFor = useCallback((format: ShareFormat) => shareImagePath(slug, format, version), [slug, version]);

  // Paylaşım dokunuşu kullanıcı etkileşimi sayılsın diye görseller pencere açılırken hazırlanır.
  const loadFile = useCallback((format: ShareFormat): Promise<File | null> => {
    pending.current[format] ??= fetch(srcFor(format))
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        const blob = await response.blob();
        const file = new File([blob], shareFileName(slug, format), { type: "image/png" });
        const url = URL.createObjectURL(file);
        objectUrls.current.push(url);
        setFiles((current) => ({ ...current, [format]: { status: "ready", file, url } }));
        return file;
      })
      .catch(() => {
        delete pending.current[format];
        setFiles((current) => ({ ...current, [format]: { status: "error" } }));
        return null;
      });
    return pending.current[format]!;
  }, [slug, srcFor]);

  useEffect(() => {
    void loadFile("story");
    void loadFile("post");
  }, [loadFile, attempt]);

  useEffect(() => {
    const urls = objectUrls;
    const requests = pending;
    return () => {
      urls.current.forEach((url) => URL.revokeObjectURL(url));
      urls.current = [];
      requests.current = {};
    };
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    const returnFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      returnFocus?.focus?.();
    };
  }, [onClose]);

  async function copyLink(silent = false) {
    const ok = await copyText(pageUrl);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
      if (!silent) toast.success(t("Bağlantı kopyalandı."), { description: t("Instagram'da bağlantı çıkartmasına yapıştır.") });
    } else if (!silent) {
      toast.error(t("Kopyalanamadı. Bağlantıyı elle seçip kopyalayabilirsin."));
    }
    return ok;
  }

  function download(format: ShareFormat, file: File | null) {
    const state = files[format];
    const href = file && state.status === "ready" && state.file === file ? state.url : file ? URL.createObjectURL(file) : srcFor(format);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = shareFileName(slug, format);
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    if (file && !objectUrls.current.includes(href)) objectUrls.current.push(href);
    setDone(format);
    toast.success(t("Görsel indirildi."), { description: t("Instagram'ı açıp görseli seç; linki bağlantı çıkartmasıyla ekle.") });
  }

  async function share(format: ShareFormat) {
    const state = files[format];
    // Hazır dosya varsa paylaşım aynı dokunuşta açılır (Safari kullanıcı etkileşimi şartı).
    const file = state.status === "ready" ? state.file : null;
    if (file && canShareFile(file)) {
      // Link, Instagram'daki bağlantı çıkartması için panoya alınır (paylaşımla aynı dokunuşta).
      const copiedPromise = copyLink(true);
      try {
        // Yalnızca dosya gönderilir: metin/URL eklenince bazı uygulamalar (Instagram dahil) görseli almıyor.
        await navigator.share({ files: [file], title: businessName });
        setDone(format);
        if (await copiedPromise) toast.success(t("Bağlantı panoda."), { description: t("Instagram'da bağlantı çıkartmasına yapıştır.") });
      } catch (reason) {
        const name = (reason as DOMException)?.name;
        if (name === "AbortError") return;
        if (name === "NotAllowedError") { toast.message(t("Paylaşmak için butona tekrar dokun.")); return; }
        download(format, file);
      }
      return;
    }
    setBusy(format);
    try {
      const loaded = file ?? (await loadFile(format));
      if (!loaded) { toast.error(t("Görsel hazırlanamadı. Lütfen tekrar dene.")); return; }
      // Görsel bu dokunuşta indirildiyse ve paylaşım destekleniyorsa ikinci dokunuşta paylaşılır.
      if (!file && canShareFile(loaded)) { toast.message(t("Görsel hazır — paylaşmak için tekrar dokun.")); return; }
      download(format, loaded);
    } finally {
      setBusy(null);
    }
  }

  const mobile = platform !== "desktop";

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="ig-share-title">
        <div className={styles.grabber} aria-hidden="true" />
        <header className={styles.head}>
          <span className={styles.badge} aria-hidden="true"><InstagramGlyph size={22} /></span>
          <div className={styles.headText}>
            <small>{t("INSTAGRAM'DA PAYLAŞ")}</small>
            <h3 id="ig-share-title">{t("Instagram için görsel")}</h3>
          </div>
          <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label={t("Kapat")}><X size={19} aria-hidden="true" /></button>
        </header>

        <div className={styles.body}>
          <p className={styles.lead}>{t("{name} için hazır tasarım: hizmetler, fiyatlar, QR kod ve randevu linki tek görselde.", { name: businessName })}</p>

          <div className={styles.previews}>
            {FORMATS.map(({ format, label, action, ratio }) => {
              const state = files[format];
              return (
                <div key={format} className={styles.option}>
                  <div className={styles.frame} style={{ aspectRatio: ratio }}>
                    {state.status === "error" ? (
                      <button type="button" className={styles.retry} onClick={() => setAttempt((value) => value + 1)}>
                        <RotateCcw size={18} aria-hidden="true" /> {t("Tekrar dene")}
                      </button>
                    ) : state.status === "loading" ? (
                      <span className={styles.skeleton} role="status" aria-label={t("Görsel hazırlanıyor")}><LoaderCircle className="animate-spin" size={20} aria-hidden="true" /></span>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element -- Sunucuda üretilen PNG'nin yerel kopyası (blob) gösterilir.
                      <img src={state.url} alt={format === "story" ? t("{name} Instagram hikâye görseli önizlemesi", { name: businessName }) : t("{name} Instagram gönderi görseli önizlemesi", { name: businessName })} className={styles.preview} />
                    )}
                    {done === format && <span className={styles.doneTag}><Check size={13} aria-hidden="true" /> {t("Hazır")}</span>}
                  </div>
                  <span className={styles.optionLabel}>{t(label)}</span>
                  <button type="button" className={`${styles.action} ${format === "story" ? styles.actionPrimary : ""}`} onClick={() => void share(format)} disabled={busy !== null || state.status === "error"}>
                    {busy === format ? <LoaderCircle className="animate-spin" size={17} aria-hidden="true" /> : mobile ? <Share2 size={17} aria-hidden="true" /> : <Download size={17} aria-hidden="true" />}
                    {t(action)}
                  </button>
                </div>
              );
            })}
          </div>

          <ol className={styles.steps}>
            <li><b>1</b><span>{mobile ? t("Paylaş menüsünden Instagram'ı seç ya da görseli indir.") : t("Görseli indir ve telefonuna gönder.")}</span></li>
            <li><b>2</b><span>{t("Instagram'ı aç → Hikâye → görseli seç.")}</span></li>
            <li><b>3</b><span>{t("Bağlantı çıkartmasıyla linki ekle. Gönderide linki biyografine koyabilirsin.")}</span></li>
          </ol>

          <div className={styles.linkRow}>
            <code className={styles.link} title={pageUrl}>{pageUrl.replace(/^https?:\/\//, "")}</code>
            <button type="button" className={styles.copy} onClick={() => void copyLink()}>
              {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />} {copied ? t("Kopyalandı") : t("Bağlantıyı kopyala")}
            </button>
          </div>

          <div className={styles.footRow}>
            {mobile ? (
              <a className={styles.ghost} href="instagram://story-camera"><InstagramGlyph size={16} /> {t("Instagram'ı aç")}</a>
            ) : null}
            {mobile ? (
              <button type="button" className={styles.ghost} onClick={() => download("story", files.story.status === "ready" ? files.story.file : null)}><Download size={16} aria-hidden="true" /> {t("Görseli indir")}</button>
            ) : (
              <a className={styles.ghost} href={srcFor("story")} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} aria-hidden="true" /> {t("Görseli yeni sekmede aç")}</a>
            )}
          </div>
          <p className={styles.brand}>{(() => {
            const [before, after] = t("Görselin altında küçük bir {signature} imzası yer alır.").split("{signature}");
            return <>{before}<b>SeninRandevun ile online randevu</b>{after}</>; // i18n-ignore (görseldeki Türkçe imza)
          })()}</p>
        </div>
      </section>
    </div>
  );
}

function decodeURIComponentSafe(value: string) {
  try { return decodeURIComponent(value); } catch { return value; }
}
