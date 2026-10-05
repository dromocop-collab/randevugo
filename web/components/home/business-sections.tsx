import type { CSSProperties } from "react";
import { BarChart3, BellRing, CalendarDays, Check, LayoutDashboard, MessageSquareText, Plus, Settings, Ticket, UsersRound, WalletCards, WandSparkles } from "lucide-react";
import { CATEGORY_CATALOG } from "@/components/marketing/category-catalog";
import styles from "./business.module.css";

/* Takvimdeki örnek bloklar: [çalışan sütunu, başlangıç satırı, süre (satır), müşteri, hizmet, ton] */
const BLOCKS: Array<[number, number, number, string, string, "green" | "lime" | "sand" | "violet"]> = [
  [0, 0, 2, "Selin K.", "Saç kesimi", "green"],
  [1, 1, 3, "Merve A.", "Manikür + jel", "violet"],
  [2, 0, 1, "Deniz Y.", "Fön", "sand"],
  [0, 3, 2, "Aylin T.", "Boya", "lime"],
  [2, 2, 3, "Ece B.", "Cilt bakımı", "green"],
  [1, 5, 1, "Zeynep", "Kaş", "sand"],
];
const HOURS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00"];
const STAFF = ["Elif", "Büşra", "Ayşe"];

/** HTML/CSS ile çizilmiş örnek işletme paneli (görsel yok → hızlı, net, koyu temaya uyumlu). Örnek veridir. */
export function ProductMockup() {
  return <div className={styles.mockStage} aria-hidden="true">
    <div className={styles.mock}>
      <div className={styles.mockBar}><span><i /><i /><i /></span><b>seninrandevun.com/dashboard</b></div>
      <div className={styles.mockBody}>
        <aside className={styles.mockSide}>
          <span className={styles.mockLogo}>SR</span>
          <span className={styles.mockNavOn}><LayoutDashboard size={14} /></span>
          <span><CalendarDays size={14} /></span>
          <span><UsersRound size={14} /></span>
          <span><WalletCards size={14} /></span>
          <span><BarChart3 size={14} /></span>
          <span><Settings size={14} /></span>
        </aside>
        <div className={styles.mockMain}>
          <div className={styles.mockHead}>
            <div><small>BUGÜN · CANLI</small><strong>Günaydın, Elif</strong></div>
            <span className={styles.mockAdd}><Plus size={13} /> Randevu</span>
          </div>
          <div className={styles.mockStats}>
            <span><small>Randevu</small><b>14</b><em>+3 online</em></span>
            <span><small>Doluluk</small><b>%86</b><em className={styles.mockBarFill} style={{ "--w": "86%" } as CSSProperties} /></span>
            <span><small>Kasa</small><b>₺9.240</b><em>12 tahsilat</em></span>
          </div>
          <div className={styles.mockCal}>
            <div className={styles.mockCalHead}><span />{STAFF.map((name) => <span key={name}>{name}</span>)}</div>
            <div className={styles.mockCalGrid}>
              <div className={styles.mockHours}>{HOURS.map((hour) => <span key={hour}>{hour}</span>)}</div>
              {STAFF.map((name, col) => <div key={name} className={styles.mockCol}>
                {BLOCKS.filter(([c]) => c === col).map(([, row, span, customer, service, tone], index) => <span key={`${customer}-${index}`} className={`${styles.mockBlock} ${styles[`tone_${tone}`]}`} style={{ "--row": row, "--span": span, "--d": `${(col * 2 + index) * 120}ms` } as CSSProperties}>
                  <b>{customer}</b><small>{service}</small>
                </span>)}
              </div>)}
              <span className={styles.mockNow} />
            </div>
          </div>
        </div>
      </div>
    </div>
    <div className={`${styles.mockFloat} ${styles.mockFloatSms}`}>
      <span><MessageSquareText size={15} /></span>
      <div><b>SMS hatırlatma gönderildi</b><small>Yarın 10:30 · Selin K.</small></div>
    </div>
    <div className={`${styles.mockFloat} ${styles.mockFloatQueue}`}>
      <span><Ticket size={15} /></span>
      <div><b>Canlı sıra · 3 kişi</b><small>Tahmini bekleme 18 dk</small></div>
    </div>
    <div className={`${styles.mockFloat} ${styles.mockFloatNew}`}>
      <span className={styles.mockFloatLime}><Check size={15} /></span>
      <div><b>Yeni online randevu</b><small>14:15 · Cilt bakımı</small></div>
      <BellRing size={14} className={styles.mockBell} />
    </div>
    <div className={`${styles.mockFloat} ${styles.mockFloatRovi}`}>
      <span><WandSparkles size={15} /></span>
      <div><b>Rovi</b><small>Yarın 14:00&apos;te boşluk var</small></div>
    </div>
  </div>;
}

/** Hangi işletmeler için: kayan kategori şeridi (dekoratif kopya aria-hidden). */
export function CategoryMarquee() {
  const items = CATEGORY_CATALOG.map((item) => `${item.emoji} ${item.label}`);
  return <div className={styles.marquee}>
    <p className={styles.marqueeLabel}>Hizmet veren her işletme için tasarlandı</p>
    <div className={styles.marqueeTrack}>
      <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
      <ul aria-hidden="true">{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </div>
  </div>;
}

export function BusinessFaq({ id, title, intro, items }: { id: string; title: string; intro?: string; items: readonly (readonly string[])[] }) {
  return <section className={styles.section} aria-labelledby={id}>
    <div className={`${styles.wrap} ${styles.faqLayout}`}>
      <div className={styles.faqIntro} data-reveal="">
        <span className={styles.kicker}>SIK SORULANLAR</span>
        <h2 id={id}>{title}</h2>
        {intro && <p>{intro}</p>}
      </div>
      <div className={styles.faqList}>
        {items.map(([question, answer], index) => <details key={question} className={styles.faqItem} data-reveal="" style={{ "--i": index } as CSSProperties}>
          <summary>{question}<span aria-hidden="true" /></summary>
          <p>{answer}</p>
        </details>)}
      </div>
    </div>
  </section>;
}
