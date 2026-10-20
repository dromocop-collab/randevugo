"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, limit, orderBy, query, type Timestamp } from "firebase/firestore";
import { MessageCircleHeart } from "lucide-react";
import { getDb } from "@/lib/firebase/firestore";
import { Panel, Pill } from "@/app/[lang]/dashboard/_studio";
import { tk } from "@/i18n/config";
import { useIntlLocale, useT } from "@/i18n/client";
import css from "./whatsapp-feedback-panel.module.css";

type Feedback = { id: string; rating: number; label: string; customerName: string; serviceName: string; staffName: string; createdAt?: Date };

const CHOICES = [
  { rating: 5, label: tk("Harikaydı"), tone: "ok" as const },
  { rating: 4, label: tk("İyiydi"), tone: "info" as const },
  { rating: 2, label: tk("Geliştirilebilir"), tone: "warn" as const },
];

/**
 * WhatsApp işlem sonrası memnuniyet yanıtları (sr_islem_sonrasi şablonu). Sunucu yazar: businesses/{id}/feedback.
 * Herkese açık yıldız puanına eklenmez; yalnız işletmenin iç göstergesidir. Yanıt yoksa panel görünmez.
 */
export function WhatsAppFeedbackPanel({ businessId }: { businessId: string }) {
  const t = useT();
  const locale = useIntlLocale();
  const [rows, setRows] = useState<Feedback[] | null>(null);

  useEffect(() => {
    let alive = true;
    getDocs(query(collection(getDb(), "businesses", businessId, "feedback"), orderBy("createdAt", "desc"), limit(200)))
      .then((snapshot) => {
        if (!alive) return;
        setRows(snapshot.docs.map((document) => {
          const data = document.data();
          return {
            id: document.id,
            rating: Number(data.rating ?? 0),
            label: String(data.label ?? ""),
            customerName: String(data.customerName ?? ""),
            serviceName: String(data.serviceName ?? ""),
            staffName: String(data.staffName ?? ""),
            createdAt: (data.createdAt as Timestamp | undefined)?.toDate?.(),
          };
        }));
      })
      .catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, [businessId]);

  const stats = useMemo(() => {
    const list = rows ?? [];
    const counts = CHOICES.map((choice) => ({ ...choice, count: list.filter((row) => row.rating === choice.rating).length }));
    const happy = list.length ? Math.round((list.filter((row) => row.rating >= 4).length / list.length) * 100) : 0;
    return { counts, happy, total: list.length };
  }, [rows]);

  if (!rows || rows.length === 0) return null;
  const toneOf = (rating: number) => CHOICES.find((choice) => choice.rating === rating)?.tone ?? "neutral";
  const labelOf = (row: Feedback) => t(CHOICES.find((choice) => choice.rating === row.rating)?.label ?? row.label);

  return (
    <Panel title={t("WhatsApp memnuniyeti")} description={t("İşlem sonrası tek soruluk mesaja verilen yanıtlar · mağaza puanına eklenmez")} icon={MessageCircleHeart}>
      <div className={css.summary}>
        <div className={css.score}>
          <b>%{stats.happy}</b>
          <span>{t("memnun müşteri")}</span>
          <small>{t("{count} yanıt", { count: stats.total })}</small>
        </div>
        <ul className={css.bars} aria-label={t("Yanıt dağılımı")}>
          {stats.counts.map((choice) => (
            <li key={choice.rating}>
              <span>{t(choice.label)}</span>
              <i aria-hidden="true"><em className={css[`bar-${choice.tone}`]} style={{ width: `${stats.total ? (choice.count / stats.total) * 100 : 0}%` }} /></i>
              <b>{choice.count}</b>
            </li>
          ))}
        </ul>
      </div>
      <ul className={css.list}>
        {rows.slice(0, 8).map((row) => (
          <li key={row.id}>
            <Pill tone={toneOf(row.rating)} dot>{labelOf(row)}</Pill>
            <span className={css.who}>
              <b>{row.customerName || t("Müşteri")}</b>
              <small>{[row.serviceName, row.staffName].filter(Boolean).join(" · ")}</small>
            </span>
            {row.createdAt ? <time className={css.when}>{row.createdAt.toLocaleDateString(locale, { day: "numeric", month: "short" })}</time> : null}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
