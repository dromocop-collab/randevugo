"use client";

import { useCallback, useEffect, useState } from "react";
import { Gift, Lock, RefreshCcw } from "lucide-react";
import { useBusinessContext } from "@/features/businesses/business-context";
import { Notice, StudioHero, StudioPage, StudioSkeleton, cx, studio as st } from "@/app/[lang]/dashboard/_studio";
import { getReferralProgram, type ReferralProgram } from "@/features/referral/referral";
import { userFacingError } from "@/lib/errors/user-facing-error";
import { useT } from "@/i18n/client";
import { tk } from "@/i18n/config";
import { ReferralView } from "./referral-view";


export default function ReferralPage() {
  const t = useT();
  const { businessId, access } = useBusinessContext();
  const canManage = access?.role !== "staff";
  const [data, setData] = useState<ReferralProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    setError(null);
    try { setData(await getReferralProgram(businessId)); }
    catch (reason) { setError(t(userFacingError(reason, tk("Davet bilgileri alınamadı.")))); }
    finally { setLoading(false); }
  }, [businessId, t]);
  useEffect(() => { if (canManage) queueMicrotask(() => void load()); }, [load, canManage]);

  if (!canManage) {
    return (
      <StudioPage label={t("Arkadaşını Getir")}>
        <StudioHero eyebrow={t("Davet")} icon={Gift} title={t("Arkadaşını Getir")} mascot={false} />
        <Notice tone="warn" icon={Lock} title={t("Yetki gerekiyor")}>{t("Davet programını yalnızca işletme sahibi ve yöneticiler görebilir.")}</Notice>
      </StudioPage>
    );
  }
  if (loading && !data) return <StudioSkeleton stats={3} rows={4} label={t("Arkadaşını Getir")} />;
  if (!data) {
    return (
      <StudioPage label={t("Arkadaşını Getir")}>
        <StudioHero eyebrow={t("Davet")} icon={Gift} title={t("Arkadaşını Getir")} mascot={false} />
        <Notice tone="bad" title={t("Davet bilgileri alınamadı")}>{error ?? t("Bağlantını kontrol edip yeniden dene.")}</Notice>
        <button type="button" className={cx(st.btn, st.btnPrimary)} onClick={() => void load()}><RefreshCcw size={16} aria-hidden /> {t("Tekrar dene")}</button>
      </StudioPage>
    );
  }

  return <ReferralView data={data} loading={loading} onReload={() => void load()} />;
}
