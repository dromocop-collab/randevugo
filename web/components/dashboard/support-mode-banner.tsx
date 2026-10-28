"use client";

import { LifeBuoy, LogOut } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useBusinessContext } from "@/features/businesses/business-context";
import { endSupportSession } from "@/features/businesses/support-mode";
import styles from "./support-mode-banner.module.css";

/** Süper admin destek modundayken panelin üstünde sabit şerit (yalnız yöneticiye görünür; metin bilerek Türkçe). */
export function SupportModeBanner() {
  const { support, businesses } = useBusinessContext();
  const router = useRouter();
  if (!support) return null;
  const name = businesses.find((business) => business.id === support.businessId)?.name || support.businessName || "İşletme";

  function exit() {
    const id = support?.businessId;
    endSupportSession();
    router.push(id ? `/super-admin/isletmeler?q=${encodeURIComponent(id)}&ac=1` : "/super-admin/isletmeler");
  }

  return (
    <div className={styles.banner} role="status">
      <span className={styles.pulse} aria-hidden="true"><LifeBuoy size={15} /></span>
      <span className={styles.text}>
        <strong>Destek modu</strong>
        <span className={styles.name}>{name}</span>
        <span className={styles.hint}>işletmesi adına düzenliyorsun. Yaptığın her değişiklik müşterinin canlı mağazasına yansır.</span>
      </span>
      <button type="button" className={styles.exit} onClick={exit}>
        <LogOut size={14} /> Çık
      </button>
    </div>
  );
}
