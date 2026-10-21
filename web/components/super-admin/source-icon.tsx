import { Globe, Home, Link2, Search, type LucideIcon } from "lucide-react";

// Trafik kaynağı ikonu: tanınan platformlar için sade marka işaretleri, diğerleri için genel ikonlar.

type Brand = "instagram" | "facebook" | "meta" | "google" | "whatsapp" | "tiktok" | "x" | "youtube" | "linkedin";

export function brandOf(kind: string, label: string): Brand | null {
  const text = label.toLowerCase();
  if (/instagram|^ig$/.test(text)) return "instagram";
  if (/facebook|^fb$/.test(text)) return "facebook";
  if (/^meta/.test(text)) return "meta";
  if (/google/.test(text)) return "google";
  if (/whatsapp/.test(text)) return "whatsapp";
  if (/tiktok/.test(text)) return "tiktok";
  if (/twitter|^x\b|x \(twitter\)/.test(text)) return "x";
  if (/youtube/.test(text)) return "youtube";
  if (/linkedin/.test(text)) return "linkedin";
  if (kind === "ads") return "meta";
  return null;
}

export const SOURCE_KIND_LABEL: Record<string, string> = {
  ads: "Reklam", social: "Sosyal medya", search: "Arama motoru", referral: "Başka site", direct: "Doğrudan", internal: "Site içi",
};

export function sourceName(kind: string, label: string) {
  const brand = brandOf(kind, label);
  const names: Record<Brand, string> = {
    instagram: "Instagram", facebook: "Facebook", meta: "Meta reklamı", google: "Google", whatsapp: "WhatsApp", tiktok: "TikTok", x: "X (Twitter)", youtube: "YouTube", linkedin: "LinkedIn",
  };
  if (brand === "meta" && kind !== "ads") return "Meta";
  if (brand) return kind === "ads" && brand !== "meta" ? `${names[brand]} reklamı` : names[brand];
  if (kind === "direct") return "Doğrudan";
  if (kind === "internal") return "Site içi";
  return label || SOURCE_KIND_LABEL[kind] || "Bilinmiyor";
}

const GENERIC: Record<string, LucideIcon> = { search: Search, referral: Globe, direct: Link2, internal: Home };

export function SourceIcon({ kind, label, size = 28 }: { kind: string; label: string; size?: number }) {
  const brand = brandOf(kind, label);
  const common = { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true as const, style: { flex: "none", display: "block" } };
  switch (brand) {
    case "instagram":
      return (
        <svg {...common}>
          <defs><linearGradient id="sr-ig" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#feda75" /><stop offset=".35" stopColor="#fa7e1e" /><stop offset=".6" stopColor="#d62976" /><stop offset="1" stopColor="#4f5bd5" /></linearGradient></defs>
          <rect x="1" y="1" width="22" height="22" rx="6.5" fill="url(#sr-ig)" />
          <rect x="6" y="6" width="12" height="12" rx="3.8" fill="none" stroke="#fff" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="2.9" fill="none" stroke="#fff" strokeWidth="1.8" /><circle cx="16.3" cy="7.7" r="1" fill="#fff" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="11" fill="#1877F2" />
          <path d="M13.3 19.5v-6.1h2.1l.3-2.4h-2.4V9.5c0-.7.2-1.2 1.2-1.2h1.3V6.2a17 17 0 0 0-1.9-.1c-1.9 0-3.2 1.2-3.2 3.3V11H8.6v2.4h2.1v6.1z" fill="#fff" />
        </svg>
      );
    case "meta":
      return (
        <svg {...common}>
          <rect x="1" y="1" width="22" height="22" rx="7" fill="#EAF2FF" />
          <path d="M4.6 14.6c0-3.3 1.6-6 3.6-6 2.7 0 4.6 7.6 7.4 7.6 1.9 0 3.8-1.8 3.8-4.5s-1.6-4.9-3.6-4.9c-2.7 0-4.7 7.6-7.5 7.6-2 0-3.7-.7-3.7-2.4z" fill="none" stroke="#0866FF" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "google":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="11" fill="#fff" stroke="#e3e6ea" />
          <path d="M18.6 12.2c0-.5 0-.9-.1-1.3H12v2.5h3.7a3.2 3.2 0 0 1-1.4 2.1v1.7h2.3c1.3-1.2 2-3 2-5z" fill="#4285F4" />
          <path d="M12 19c1.9 0 3.5-.6 4.6-1.7l-2.3-1.7c-.6.4-1.4.7-2.3.7a4 4 0 0 1-3.8-2.8H5.9v1.8A7 7 0 0 0 12 19z" fill="#34A853" />
          <path d="M8.2 13.5a4.2 4.2 0 0 1 0-2.9V8.8H5.9a7 7 0 0 0 0 6.5z" fill="#FBBC05" />
          <path d="M12 7.7c1 0 2 .4 2.7 1.1l2-2A7 7 0 0 0 5.9 8.8l2.3 1.8A4 4 0 0 1 12 7.7z" fill="#EA4335" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="11" fill="#25D366" />
          <path d="M12 5.6a6.3 6.3 0 0 0-5.4 9.6L6 18l2.9-.7A6.3 6.3 0 1 0 12 5.6z" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M9.9 9.3c.2-.4.4-.4.6-.4h.4c.1 0 .3 0 .4.3l.6 1.3c0 .1 0 .3-.1.4l-.4.5c.4.8 1 1.4 1.9 1.8l.5-.6c.1-.1.3-.2.4-.1l1.3.6c.2.1.3.2.2.4 0 .6-.5 1.2-1.1 1.3-.5.1-1.6 0-3-1.1-1.4-1.2-1.9-2.4-2-3 0-.5.1-1 .3-1.4z" fill="#fff" />
        </svg>
      );
    case "tiktok":
      return <svg {...common}><circle cx="12" cy="12" r="11" fill="#111" /><path d="M13.6 6v7.7a2.4 2.4 0 1 1-2.1-2.4V9.2a4.5 4.5 0 1 0 4.2 4.5V9.9c.8.6 1.8.9 2.8.9V8.7c-1.6 0-2.8-1.2-2.9-2.7z" fill="#fff" /></svg>;
    case "x":
      return <svg {...common}><circle cx="12" cy="12" r="11" fill="#111" /><path d="M7.5 7h2.7l2.3 3.2L15.3 7h1.4l-3.6 4 4 5.9h-2.7l-2.5-3.5-3.1 3.5H7.4l3.9-4.4z" fill="#fff" /></svg>;
    case "youtube":
      return <svg {...common}><rect x="1" y="4.5" width="22" height="15" rx="4.5" fill="#FF0000" /><path d="M10 9v6l5.2-3z" fill="#fff" /></svg>;
    case "linkedin":
      return <svg {...common}><rect x="1" y="1" width="22" height="22" rx="5" fill="#0A66C2" /><path d="M7 10h2.3v7H7zm1.2-3.6a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6zM11 10h2.2v1c.4-.7 1.2-1.2 2.3-1.2 2 0 2.5 1.3 2.5 3V17h-2.3v-3.7c0-.9-.1-1.7-1.1-1.7s-1.3.8-1.3 1.6V17H11z" fill="#fff" /></svg>;
    default: {
      const Icon = GENERIC[kind] ?? Globe;
      return (
        <span aria-hidden style={{ display: "grid", placeItems: "center", flex: "none", width: size, height: size, borderRadius: size * 0.32, background: "var(--sa-neutral-bg, rgba(127,127,127,.14))", color: "var(--sa-muted, currentColor)" }}>
          <Icon size={Math.round(size * 0.55)} />
        </span>
      );
    }
  }
}
