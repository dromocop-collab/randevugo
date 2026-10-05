"use client";

import { useId, useState } from "react";
import { cx, studio } from "@/app/dashboard/_studio";
import css from "./analitik.module.css";

/* Kütüphanesiz, saf CSS / satır içi SVG grafikler. Her grafik role="img" + ekran okuyucu özeti taşır. */

export type ColumnDatum = { key: string; label: string; short: string; value: number; display?: string };

/** Dikey sütun grafiği. Dokunulan/odaklanan sütunun değeri üstte okunur. */
export function ColumnChart({ data, label, unit = "randevu", height = 180, labelEvery = 1 }: {
  data: ColumnDatum[];
  label: string;
  unit?: string;
  height?: number;
  labelEvery?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...data.map((item) => item.value), 1);
  const peakIndex = data.reduce((best, item, index) => item.value > data[best].value ? index : best, 0);
  const focus = active ?? peakIndex;
  const focused = data[focus];
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <figure className={css.chart}>
      <figcaption className={css.chartReadout} aria-live="polite">
        {focused ? <><b>{focused.display ?? focused.value}</b><span>{active === null ? "en yüksek · " : ""}{focused.label}</span></> : null}
      </figcaption>
      <div className={css.columns} style={{ height }} role="img" aria-label={`${label}. Toplam ${total} ${unit}.`} onMouseLeave={() => setActive(null)}>
        {data.map((item, index) => (
          <span
            key={item.key}
            className={cx(css.column, index === peakIndex && item.value > 0 && css.columnPeak, index === active && css.columnActive)}
            onMouseEnter={() => setActive(index)}
            onClick={() => setActive(index === active ? null : index)}
            title={`${item.label}: ${item.display ?? item.value}`}
          >
            <i style={{ height: `${item.value ? Math.max(4, Math.round(item.value / max * 100)) : 2}%` }} />
          </span>
        ))}
      </div>
      <div className={css.columnLabels} aria-hidden>
        {data.map((item, index) => (
          <span key={item.key}>{index % labelEvery === 0 || index === data.length - 1 ? item.short : ""}</span>
        ))}
      </div>
      <ul className={studio.srOnly}>
        {data.map((item) => <li key={item.key}>{item.label}: {item.display ?? `${item.value} ${unit}`}</li>)}
      </ul>
    </figure>
  );
}

/** Alan grafiği (SVG). Gelir eğrisi için. */
export function AreaChart({ values, label, summary, height = 120 }: { values: number[]; label: string; summary: string; height?: number }) {
  const gradientId = `area-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const width = 300;
  const max = Math.max(...values, 1);
  const n = Math.max(values.length - 1, 1);
  const points = values.map((value, index) => [index / n * width, height - 6 - (value / max) * (height - 14)] as const);
  const line = points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  const last = points[points.length - 1];
  return (
    <figure className={css.area}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`${label}. ${summary}`} style={{ height }}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" className={css.areaStopTop} />
            <stop offset="100%" className={css.areaStopBottom} />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} className={css.areaLine} />
        {last ? <circle cx={last[0]} cy={last[1]} r={4} className={css.areaDot} /> : null}
      </svg>
      <figcaption className={studio.srOnly}>{summary}</figcaption>
    </figure>
  );
}

export type BarDatum = { key: string; label: string; value: number; display: string; meta?: string };

/** Yatay sıralı çubuklar (hizmet, ekip). */
export function RankBars({ data, label }: { data: BarDatum[]; label: string }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <ol className={css.rank} aria-label={label}>
      {data.map((item, index) => (
        <li key={item.key} className={css.rankRow}>
          <span className={css.rankIndex} aria-hidden>{index + 1}</span>
          <div className={css.rankBody}>
            <div className={css.rankTop}>
              <b>{item.label}</b>
              <strong>{item.display}</strong>
            </div>
            <span className={css.rankTrack} aria-hidden><i style={{ width: `${Math.max(6, Math.round(item.value / max * 100))}%` }} /></span>
            {item.meta ? <small>{item.meta}</small> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Tek şeritli yığılmış dağılım + açıklama. */
export function StackBar({ data, label, total }: { data: Array<{ key: string; label: string; value: number; percent: number; tone: string }>; label: string; total: number }) {
  return (
    <div className={css.stack}>
      <div className={css.stackTrack} role="img" aria-label={`${label}: ${data.map((item) => `${item.label} ${item.value}`).join(", ")}. Toplam ${total}.`}>
        {total ? data.filter((item) => item.value > 0).map((item) => (
          <i key={item.key} className={css.tone} data-tone={item.tone} style={{ flexGrow: item.value }} title={`${item.label}: ${item.value}`} />
        )) : null}
      </div>
      <ul className={css.legend}>
        {data.map((item) => (
          <li key={item.key}>
            <span className={cx(css.legendDot, css.tone)} data-tone={item.tone} aria-hidden />
            <span className={css.legendLabel}>{item.label}</span>
            <b>{item.value}</b>
            <small>%{item.percent}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
