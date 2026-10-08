"use client";

import Link from "next/link";
import { toast } from "sonner";
import { ChartNoAxesCombined, PenLine, Share2, Store } from "lucide-react";
import { useBusiness } from "@/hooks/use-business";
import { companionLinks, isManagerRole } from "@/features/business-companion/companion-domain";
import { useCompanionPreviewFlag } from "@/features/business-companion/preview-flag";
import styles from "./storefront-owner-bar.module.css";

/**
 * İşletmenin KENDİ vitrin sayfasında (/isletme/<slug>) yöneticiye görünen ince şerit:
 * "Bu senin mağazan — Düzenle / İstatistik / Paylaş". Ek okuma yapmaz (BusinessProvider listesini kullanır).
 */
export function StorefrontOwnerBar({ businessId, slug, name }: { businessId: string; slug: string; name: string }) {
  const { businesses, setBusinessId, businessId: activeId } = useBusiness();
  const preview = useCompanionPreviewFlag();
  const mine = businesses.find((business) => business.id === businessId);
  if (!preview && (!mine || !isManagerRole(mine.currentUserRole ?? "owner"))) return null;

  // Panel bağlantıları seçili işletmeye göre açılır; vitrin başka işletmenseyse önce onu seç.
  const selectThis = () => {
    if (activeId !== businessId) setBusinessId(businessId);
  };

  const share = async () => {
    const url = `${window.location.origin}${companionLinks.storefront(slug)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: name, text: `${name} — online randevu`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Mağaza linki kopyalandı", { description: url });
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") return;
      toast.error("Paylaşılamadı", { description: url });
    }
  };

  return (
    <aside className={styles.bar} aria-label="Mağaza sahibi araçları">
      <span className={styles.mark} aria-hidden="true"><Store size={16} /></span>
      <p className={styles.copy}><b>Bu senin mağazan</b><span>Müşterilerin sayfanı böyle görüyor.</span></p>
      <div className={styles.actions}>
        <Link href={companionLinks.settings} onClick={selectThis} className={styles.action}><PenLine size={15} aria-hidden="true" /> Düzenle</Link>
        <Link href={companionLinks.analytics} onClick={selectThis} className={styles.action}><ChartNoAxesCombined size={15} aria-hidden="true" /> İstatistik</Link>
        <button type="button" onClick={() => void share()} className={`${styles.action} ${styles.primary}`}><Share2 size={15} aria-hidden="true" /> Paylaş</button>
      </div>
    </aside>
  );
}
