"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Check, Copy, Gift, Link2, Lock, MessageCircle, RefreshCcw, Share2, ShieldCheck, Sparkles, UserPlus, Users } from "lucide-react";
import { EmptyState, HeroChip, Notice, Panel, Pill, StudioHero, StudioPage, cx, studio as st, type PillTone } from "@/app/[lang]/dashboard/_studio";
import type { ReferralProgram, ReferralRow } from "@/features/referral/referral";
import { useIntlLocale, useT } from "@/i18n/client";
import { tk } from "@/i18n/config";
import css from "./davet.module.css";

const STATUS: Record<string, { label: string; tone: PillTone }> = {
  pending: { label: tk("Onay bekliyor"), tone: "warn" },
  rewarded: { label: tk("Hediye kazanıldı"), tone: "ok" },
  blocked: { label: tk("Geçersiz"), tone: "neutral" },
  rejected: { label: tk("Geçersiz"), tone: "neutral" },
};

/** Arkadaşını Getir görünümü (veri page.tsx'te yüklenir). */
export function ReferralView({ data, loading, onReload }: { data: ReferralProgram; loading: boolean; onReload: () => void }) {
  const t = useT();
  const locale = useIntlLocale();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const copy = (value: string, kind: "code" | "link") => {
    void navigator.clipboard?.writeText(value).then(() => {
      setCopied(kind);
      toast.success(kind === "code" ? t("Kod kopyalandı") : t("Bağlantı kopyalandı"));
      window.setTimeout(() => setCopied(null), 1800);
    }).catch(() => toast.message(value));
  };

  const months = data.rewardMonths;
  const shareText = t("Randevularımı Senin Randevun ile yönetiyorum, sen de dene! Bu bağlantıyla kaydolursan beni davet etmiş olursun: {link}", { link: data.link });
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const dateOf = (ms: number | null) => ms ? new Date(ms).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <StudioPage label={t("Arkadaşını Getir")}>
      <StudioHero
        eyebrow={t("Davet")}
        icon={Gift}
        title={months === 1 ? t("Arkadaşını getir, 1 ay hediye kazan") : t("Arkadaşını getir, {months} ay hediye kazan", { months })}
        description={t("Davet kodunla kaydolan her yeni işletme yayına girdiğinde, paketine {months} ay ücretsiz kullanım eklenir. Tüm şubelerinde geçerlidir.", { months })}
        mascot={false}
      >
        <HeroChip icon={Users} value={data.stats.invited} label={t("davet")} />
        <HeroChip icon={Gift} value={data.stats.rewarded} label={t("katıldı")} />
        <HeroChip icon={CalendarPlus} value={data.stats.monthsEarned} label={t("ay kazanıldı")} />
      </StudioHero>

      {!data.enabled ? <Notice tone="warn" icon={Lock} title={t("Davet programı şu anda kapalı")}>{t("Kodun saklanıyor; program yeniden açılınca kullanılabilir.")}</Notice> : null}

      <div className={css.layout}>
        <Panel title={t("Davet kodun")} icon={Sparkles}>
          <div className={css.codeCard}>
            <small>{t("KODUN")}</small>
            <button type="button" className={css.code} onClick={() => copy(data.code, "code")} aria-label={t("Kodu kopyala: {code}", { code: data.code })}>
              <span>{data.code}</span>
              {copied === "code" ? <Check size={20} aria-hidden /> : <Copy size={20} aria-hidden />}
            </button>
            <p>{t("Arkadaşın kayıt olurken bu kodu yazabilir ya da aşağıdaki bağlantıyla gelebilir.")}</p>
          </div>
          <div className={css.linkRow}>
            <Link2 size={16} aria-hidden />
            <code>{data.link.replace(/^https:\/\//, "")}</code>
            <button type="button" className={cx(st.btn, st.btnSm)} onClick={() => copy(data.link, "link")}>
              {copied === "link" ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />} {t("Kopyala")}
            </button>
          </div>
          <div className={css.shareRow}>
            <a className={cx(st.btn, st.btnPrimary)} href={whatsappUrl} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} aria-hidden /> {t("WhatsApp'ta paylaş")}</a>
            {canShare ? (
              <button type="button" className={cx(st.btn, st.btnSoft)} onClick={() => { void navigator.share({ title: "Senin Randevun", text: shareText, url: data.link }).catch(() => undefined); }}>
                <Share2 size={17} aria-hidden /> {t("Paylaş")}
              </button>
            ) : null}
          </div>
        </Panel>

        <Panel title={t("Nasıl çalışır?")} icon={ShieldCheck}>
          <ol className={css.steps}>
            <li><i aria-hidden>1</i><span><b>{t("Paylaş")}</b>{t("Kodunu ya da bağlantını işletme sahibi arkadaşlarına gönder.")}</span></li>
            <li><i aria-hidden>2</i><span><b>{t("Arkadaşın kaydolsun")}</b>{t("Web'den ya da WhatsApp'tan kaydolurken davetin otomatik tanınır.")}</span></li>
            <li><i aria-hidden>3</i><span><b>{t("Hediyen tanımlansın")}</b>{months === 1 ? t("Mağazası yayına girince paketine 1 ay eklenir; bildirim alırsın.") : t("Mağazası yayına girince paketine {months} ay eklenir; bildirim alırsın.", { months })}</span></li>
          </ol>
          <p className={css.fine}>{t("Kendi şubelerin ve aynı telefon/e-postayla açılan kayıtlar sayılmaz. Yılda en fazla {cap} hediye kazanılabilir.", { cap: data.yearlyCap })}</p>
        </Panel>
      </div>

      <Panel title={t("Davetlerin")} icon={UserPlus} actions={<button type="button" className={cx(st.btn, st.btnSm, st.btnGhost)} onClick={onReload} disabled={loading}><RefreshCcw size={15} aria-hidden /> {t("Yenile")}</button>}>
        {data.referrals.length === 0 ? (
          <EmptyState title={t("Henüz davet yok")} description={t("İlk arkadaşını davet et; katıldığında burada görünür.")} />
        ) : (
          <ul className={css.list}>
            {data.referrals.map((row: ReferralRow) => {
              const status = STATUS[row.status] ?? STATUS.pending!;
              return (
                <li key={row.id}>
                  <span className={css.avatar} aria-hidden>{row.businessName.slice(0, 1).toLocaleUpperCase(locale)}</span>
                  <span className={css.rowMain}>
                    <b>{row.businessName}</b>
                    <small>{row.status === "rewarded" ? t("{date} · +{months} ay", { date: dateOf(row.rewardedAt), months: row.rewardMonths }) : row.reason ? t(row.reason) : t("Kayıt: {date}", { date: dateOf(row.createdAt) })}</small>
                  </span>
                  <Pill tone={status.tone} dot>{t(status.label)}</Pill>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </StudioPage>
  );
}
