"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight, CalendarPlus, Camera, Check, Copy, Download, ExternalLink, ImagePlus,
  Link2, MessageCircle, RefreshCw, ShieldCheck, UserPlus,
} from "lucide-react";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import { encodeQr, qrSvgPath } from "@/features/businesses/qr-code";
import { storeDisplayUrl, storeUrl, whatsappShareUrl } from "@/features/businesses/setup-helpers";
import r from "./store-ready.module.css";

export interface StoreReadyProps {
  businessName: string;
  slug: string;
  pendingApproval: boolean;
  servicesCreated: number;
  servicesFailed: boolean;
  onRetryServices?: () => Promise<void>;
  logoUploaded?: boolean;
  coverUploaded?: boolean;
  onGoToDashboard: () => void;
}

function InstagramGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

const CONFETTI = Array.from({ length: 18 }, (_, index) => index);

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Eski tarayıcılar / izin yoksa geçici textarea ile dene.
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

/** "Mağazan hazır" — işletme oluşturulduktan sonra paylaşım ve ilk adımlar ekranı. */
export function StoreReady({ businessName, slug, pendingApproval, servicesCreated, servicesFailed, onRetryServices, logoUploaded, coverUploaded, onGoToDashboard }: StoreReadyProps) {
  const url = storeUrl(slug);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const qr = useMemo(() => {
    const matrix = encodeQr(url);
    return { size: matrix.size, path: qrSvgPath(matrix) };
  }, [url]);

  async function copyLink(source: "link" | "instagram") {
    const ok = await copyText(url);
    if (!ok) {
      toast.error("Kopyalanamadı. Bağlantıyı elle seçip kopyalayabilirsin.");
      return;
    }
    setCopied(true);
    setShared(true);
    window.setTimeout(() => setCopied(false), 2200);
    toast.success(source === "instagram"
      ? "Link kopyalandı. Instagram › Profili düzenle › Bağlantılar › Bağlantı ekle adımıyla biyografine yapıştır."
      : "Mağaza linkin kopyalandı.");
  }

  function downloadQr() {
    const margin = 4;
    const full = qr.size + margin * 2;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-margin} ${-margin} ${full} ${full}" width="1024" height="1024" shape-rendering="crispEdges"><rect x="${-margin}" y="${-margin}" width="${full}" height="${full}" fill="#fff"/><path d="${qr.path}" fill="#0c2a1b"/></svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${slug}-randevu-qr.svg`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
  }

  async function retry() {
    if (!onRetryServices) return;
    setRetrying(true);
    try { await onRetryServices(); } finally { setRetrying(false); }
  }

  const steps = [
    { id: "logo", label: "Logo yükle", hint: "Müşteriler seni tanısın", href: "/dashboard/ayarlar", icon: ImagePlus, done: Boolean(logoUploaded) },
    { id: "cover", label: "Kapak fotoğrafı ekle", hint: "Vitrinin ilk izlenimi", href: "/dashboard/ayarlar", icon: Camera, done: Boolean(coverUploaded) },
    { id: "staff", label: "İlk çalışanını davet et", hint: "Takvimler ve yetkiler", href: "/dashboard/calisanlar", icon: UserPlus, done: false },
    { id: "test", label: "Test randevusu al", hint: "Akışı kendin dene", href: "/dashboard/randevular", icon: CalendarPlus, done: false },
    { id: "share", label: "Linkini paylaş", hint: "WhatsApp, Instagram, QR", href: null, icon: Link2, done: shared },
  ];
  const doneCount = steps.filter((item) => item.done).length;

  return (
    <section className={r.root} aria-labelledby="store-ready-title">
      <div className={r.confetti} aria-hidden="true">{CONFETTI.map((index) => <i key={index} style={{ ["--i" as string]: index }} />)}</div>

      <header className={r.hero}>
        <RoviMascot size={104} mood="happy" alt="Rovi kutluyor" priority />
        <div>
          <span className={r.eyebrow}>KURULUM TAMAMLANDI</span>
          <h1 id="store-ready-title">Mağazan hazır!</h1>
          <p><b>{businessName}</b> için randevu sayfan oluşturuldu{servicesCreated ? `; ${servicesCreated} hizmet online randevuya açıldı` : ""}.</p>
        </div>
      </header>

      {pendingApproval ? (
        <p className={r.notice}><ShieldCheck size={17} aria-hidden="true" /><span>Mağazan kısa bir kontrolden sonra herkese açık yayına girer. Bu sürede paneli hazırlayabilir, linkini şimdiden paylaşmaya hazır tutabilirsin.</span></p>
      ) : null}
      {servicesFailed ? (
        <p className={`${r.notice} ${r.warn}`}>
          <RefreshCw size={17} aria-hidden="true" />
          <span>Seçtiğin hizmetlerin bir kısmı eklenemedi.</span>
          {onRetryServices ? <button type="button" onClick={retry} disabled={retrying}>{retrying ? "Deneniyor…" : "Tekrar dene"}</button> : null}
        </p>
      ) : null}

      <div className={r.grid}>
        <div className={r.share}>
          <span className={r.label}>Mağaza linkin</span>
          <div className={r.linkRow}>
            <code title={url}>{storeDisplayUrl(slug)}</code>
            <button type="button" className={r.copy} onClick={() => copyLink("link")} aria-label="Mağaza linkini kopyala">
              {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}<span>{copied ? "Kopyalandı" : "Kopyala"}</span>
            </button>
          </div>
          <span className="sr-only" aria-live="polite">{copied ? "Link panoya kopyalandı" : ""}</span>
          <div className={r.actions}>
            <a className={r.whatsapp} href={whatsappShareUrl(businessName, url)} target="_blank" rel="noopener noreferrer" onClick={() => setShared(true)}>
              <MessageCircle size={18} aria-hidden="true" /> WhatsApp&apos;ta paylaş
            </a>
            <button type="button" className={r.instagram} onClick={() => copyLink("instagram")}>
              <InstagramGlyph /> Instagram biyografine ekle
            </button>
          </div>
          <p className={r.igHint}>Instagram&apos;da <b>Profili düzenle › Bağlantılar</b> bölümüne yapıştır; takipçilerin tek dokunuşla randevu alsın.</p>
          {!pendingApproval ? <a className={r.visit} href={url} target="_blank" rel="noopener noreferrer">Mağazamı aç <ExternalLink size={14} aria-hidden="true" /></a> : null}
        </div>

        <div className={r.qrCard}>
          <svg viewBox={`-4 -4 ${qr.size + 8} ${qr.size + 8}`} role="img" aria-label={`${storeDisplayUrl(slug)} adresinin QR kodu`} shapeRendering="crispEdges" className={r.qr}>
            <rect x={-4} y={-4} width={qr.size + 8} height={qr.size + 8} fill="#fff" />
            <path d={qr.path} fill="#0c2a1b" />
          </svg>
          <p>Kasaya, vitrine veya kartvizite koy; müşterin okutunca randevu sayfan açılsın.</p>
          <button type="button" className={r.ghost} onClick={downloadQr}><Download size={16} aria-hidden="true" /> QR&apos;ı indir</button>
        </div>
      </div>

      <div className={r.checklist}>
        <div className={r.checkHead}>
          <h2>İlk adımların</h2>
          <span>{doneCount}/{steps.length}</span>
        </div>
        <div className={r.meter} aria-hidden="true"><i style={{ width: `${(doneCount / steps.length) * 100}%` }} /></div>
        <ul>
          {steps.map(({ id, label, hint, href, icon: Icon, done }) => {
            const body = <><span className={`${r.dot} ${done ? r.dotDone : ""}`} aria-hidden="true">{done ? <Check size={14} /> : <Icon size={15} />}</span><span className={r.itemText}><b>{label}</b><small>{done ? "Tamamlandı" : hint}</small></span>{!done ? <ArrowRight size={16} aria-hidden="true" className={r.itemArrow} /> : null}</>;
            return (
              <li key={id} className={done ? r.itemDone : ""}>
                {href ? <Link href={href}>{body}</Link> : <button type="button" onClick={() => copyLink("link")}>{body}</button>}
              </li>
            );
          })}
        </ul>
      </div>

      <button type="button" className={r.primary} onClick={onGoToDashboard}>Panele git <ArrowRight size={18} aria-hidden="true" /></button>
    </section>
  );
}
