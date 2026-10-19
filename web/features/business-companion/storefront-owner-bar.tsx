"use client";

import Link from "@/i18n/link";
import { toast } from "sonner";
import { ChartNoAxesCombined, PenLine, Share2, Store } from "lucide-react";
import { useBusiness } from "@/hooks/use-business";
import { companionLinks, isManagerRole } from "@/features/business-companion/companion-domain";
import { useCompanionPreviewFlag } from "@/features/business-companion/preview-flag";
import { InstagramGlyph } from "@/features/share/instagram-glyph";
import { useT } from "@/i18n/client";
import styles from "./storefront-owner-bar.module.css";

/**
 * İşletmenin KENDİ vitrin sayfasında (/isletme/<slug>) yöneticiye görünen ince şerit:
 * "Bu senin mağazan — Düzenle / İstatistik / Instagram / Paylaş". Ek okuma yapmaz (BusinessProvider listesini kullanır).
 */
export function StorefrontOwnerBar({ businessId, slug, name, onInstagram }: { businessId: string; slug: string; name: string; onInstagram?: () => void }) {
  const t = useT();
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
        await navigator.share({ title: name, text: t("{name} — online randevu", { name }), url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success(t("Mağaza linki kopyalandı"), { description: url });
    } catch (error) {
      if ((error as { name?: string })?.name === "AbortError") return;
      toast.error(t("Paylaşılamadı"), { description: url });
    }
  };

  return (
    <aside className={styles.bar} aria-label={t("Mağaza sahibi araçları")}>
      <span className={styles.mark} aria-hidden="true"><Store size={16} /></span>
      <p className={styles.copy}><b>{t("Bu senin mağazan")}</b><span>{t("Müşterilerin sayfanı böyle görüyor.")}</span></p>
      <div className={styles.actions}>
        <Link href={companionLinks.settings} onClick={selectThis} className={styles.action}><PenLine size={15} aria-hidden="true" /> {t("Düzenle")}</Link>
        <Link href={companionLinks.analytics} onClick={selectThis} className={styles.action}><ChartNoAxesCombined size={15} aria-hidden="true" /> {t("İstatistik")}</Link>
        {onInstagram ? <button type="button" onClick={onInstagram} className={styles.action} aria-haspopup="dialog" title={t("Instagram için görsel")}><InstagramGlyph size={15} /> Instagram</button> : null}
        <button type="button" onClick={() => void share()} className={`${styles.action} ${styles.primary}`}><Share2 size={15} aria-hidden="true" /> {t("Paylaş")}</button>
      </div>
    </aside>
  );
}
