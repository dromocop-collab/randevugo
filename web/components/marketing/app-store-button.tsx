import { Apple, ArrowUpRight } from "lucide-react";
import { APP_STORE_URL } from "@/lib/app-store";

export function AppStoreButton({ compact = false }: { compact?: boolean }) {
  return <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className={`app-store-button ${compact ? "compact" : ""}`} aria-label="SeninRandevun uygulamasını App Store'da aç">
    <Apple size={compact ? 19 : 26} fill="currentColor" />
    <span><small>ŞİMDİ İNDİRİN</small><b>App Store</b></span>
    <ArrowUpRight size={compact ? 13 : 16}/>
  </a>;
}

