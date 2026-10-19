import { Bell, CalendarCheck2, Check, ChevronRight, CircleUserRound, Clock3, CreditCard, Crown, MessageSquareText, Package, PawPrint, Plus, ShieldCheck, Smartphone, Star, UserRound, UsersRound, Wallet } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { tk } from "@/i18n/config";
import { getT } from "@/i18n/server";
import m from "./feature-mockups.module.css";

/* Tüm görseller temsilîdir: isimler, saatler ve tutarlar örnek veridir. */

async function Frame({ title, children, tone = "light" }: { title: string; children: ReactNode; tone?: "light" | "dark" }) {
  const t = await getT();
  return (
    <div className={`${m.frame} ${tone === "dark" ? m.frameDark : ""}`} role="img" aria-label={t("{title} — örnek ekran görünümü", { title })}>
      <div className={m.frameBar} aria-hidden="true"><i /><i /><i /><span>{title}</span></div>
      <div className={m.frameBody} aria-hidden="true">{children}</div>
    </div>
  );
}

export async function CalendarMockup() {
  const t = await getT();
  const staff = [
    { name: "Elif", items: [{ top: 6, h: 26, t: tk("Saç kesimi"), c: m.tGreen }, { top: 40, h: 34, t: tk("Boya + fön"), c: m.tLime }] },
    { name: "Mert", items: [{ top: 18, h: 22, t: tk("Sakal tıraşı"), c: m.tSky }, { top: 58, h: 26, t: tk("Saç kesimi"), c: m.tGreen }] },
    { name: "Zeynep", items: [{ top: 2, h: 40, t: tk("Cilt bakımı"), c: m.tAmber }, { top: 66, h: 20, t: tk("Mola"), c: m.tMuted }] },
  ];
  return (
    <Frame title={t("Takvim · Bugün")}>
      <div className={m.calHead}><b>{t("Salı")}</b><span>{t("Gün")}</span><span className={m.on}>{t("Hafta")}</span><span>{t("Ay")}</span></div>
      <div className={m.cal}>
        <div className={m.calHours}>{["09", "10", "11", "12", "13"].map((h) => <span key={h}>{h}:00</span>)}</div>
        {staff.map((s) => (
          <div key={s.name} className={m.calCol}>
            <b>{s.name}</b>
            <div className={m.calTrack}>
              {s.items.map((item) => <span key={item.t + item.top} className={`${m.calItem} ${item.c}`} style={{ top: `${item.top}%`, height: `${item.h}%` }}>{t(item.t)}</span>)}
            </div>
          </div>
        ))}
        <span className={m.nowLine} style={{ top: "52%" }} />
      </div>
      <div className={m.toast}><Check size={13} /> {t("Çakışma yok · saat uygun")}</div>
    </Frame>
  );
}

export async function BookingMockup() {
  const t = await getT();
  return (
    <div className={m.phone} role="img" aria-label={t("Online randevu akışı — örnek ekran görünümü")}>
      <div className={m.phoneScreen} aria-hidden="true">
        <span className={m.island} />
        <div className={m.phoneHead}><small>{t("ADIM 3 / 4")}</small><b>{t("Saat seçin")}</b></div>
        <div className={m.steps}><i className={m.done} /><i className={m.done} /><i className={m.cur} /><i /></div>
        <div className={m.pickCard}><span className={m.avatar}>E</span><div><b>{t("Saç kesimi · 45 dk")}</b><small>{t("{name} ile", { name: "Elif" })}</small></div></div>
        <div className={m.days}>{[[tk("Pzt"), "12"], [tk("Sal"), "13"], [tk("Çar"), "14"], [tk("Per"), "15"]].map(([d, n], i) => <span key={d} className={i === 1 ? m.dayOn : ""}><small>{t(d)}</small><b>{n}</b></span>)}</div>
        <div className={m.slots}>{["10:00", "10:45", "11:30", "13:15", "14:00", "15:30"].map((s, i) => <span key={s} className={i === 2 ? m.slotOn : i === 4 ? m.slotOff : ""}>{s}</span>)}</div>
        <span className={m.phoneCta}>{t("Randevuyu onayla")} <ChevronRight size={14} /></span>
      </div>
    </div>
  );
}

export async function ReminderMockup() {
  const t = await getT();
  return (
    <div className={m.notifyStage} role="img" aria-label={t("SMS ve anlık bildirim hatırlatmaları — örnek görünüm")}>
      <div aria-hidden="true" className={m.notifyStack}>
        <div className={`${m.notify} ${m.n1}`}>
          <span className={m.appIcon}><CalendarCheck2 size={16} /></span>
          <div><b>SeninRandevun <small>{t("şimdi")}</small></b><p>{t("Randevunuza 1 saat kaldı · 14:00 Saç kesimi")}</p></div>
        </div>
        <div className={`${m.notify} ${m.n2}`}>
          <span className={`${m.appIcon} ${m.smsIcon}`}><MessageSquareText size={16} /></span>
          <div><b>SMS <small>09:12</small></b><p>{t("Randevunuz onaylandı. Değişiklik için bağlantıyı kullanabilirsiniz.")}</p></div>
        </div>
        <div className={`${m.notify} ${m.n3}`}>
          <span className={`${m.appIcon} ${m.bizIcon}`}><Bell size={16} /></span>
          {/* i18n-ignore — örnek müşteri adı */}
          <div><b>{t("İşletme paneli")} <small>{t("{minutes} dk", { minutes: 1 })}</small></b><p>{t("Yeni randevu: {name} · Perşembe 11:30", { name: "Ayşe K." })}</p></div>
        </div>
      </div>
    </div>
  );
}

export async function QueueMockup() {
  const t = await getT();
  const rows = [["A12", "Burak T.", t("Şimdi"), m.qNow], ["A13", "Selin A.", t("~{minutes} dk", { minutes: 10 }), ""], ["A14", "Kaan D.", t("~{minutes} dk", { minutes: 25 }), ""], ["A15", "Deniz Y.", t("~{minutes} dk", { minutes: 40 }), ""]];
  return (
    <Frame title={t("Canlı sıra")} tone="dark">
      <div className={m.qHead}><span className={m.live}><i /> {t("CANLI")}</span><b>{t("{count} kişi bekliyor", { count: 4 })}</b></div>
      <ul className={m.queue}>
        {rows.map(([no, name, eta, cls]) => <li key={no} className={cls}><b>{no}</b><span>{name}</span><small>{eta}</small></li>)}
      </ul>
      <div className={m.qActions}><span>{t("Sıradakini çağır")}</span><span>{t("Müşteri ekle")} <Plus size={12} /></span></div>
    </Frame>
  );
}

export async function TeamMockup() {
  const t = await getT();
  const roles = [
    { icon: Crown, name: t("İşletme Sahibi"), text: t("Abonelik, üyeler, kritik ayarlar") },
    { icon: ShieldCheck, name: t("Yönetici"), text: t("Randevular, ekip, hizmetler, ayarlar") },
    { icon: UsersRound, name: t("Müdür"), text: t("Günlük operasyon, takvim, CRM") },
    { icon: UserRound, name: t("Çalışan"), text: t("Kendi randevuları ve takvimi") },
  ];
  return (
    <Frame title={t("Ekip ve yetkiler")}>
      <ul className={m.roles}>
        {roles.map(({ icon: Icon, name, text }, i) => <li key={name}><span className={m.roleIcon}><Icon size={15} /></span><div><b>{name}</b><small>{text}</small></div><i className={i < 2 ? m.toggleOn : m.toggle} /></li>)}
      </ul>
    </Frame>
  );
}

export async function CrmMockup() {
  const t = await getT();
  return (
    <Frame title={t("Müşteri kartı")}>
      {/* i18n-ignore — örnek müşteri adı */}
      <div className={m.crmHead}><span className={m.avatarLg}>AK</span><div><b>Ayşe K.</b><small>{t("Müşteri · {count} ziyaret", { count: 14 })}</small></div><span className={m.badge}><Star size={11} /> {t("Sadık")}</span></div>
      <div className={m.crmStats}><span><b>14</b><small>{t("Ziyaret")}</small></span><span><b>2</b><small>{t("Yaklaşan")}</small></span><span><b>6/10</b><small>{t("Paket seansı")}</small></span></div>
      <div className={m.note}><small>{t("NOT")}</small><p>{t("Kısa kesim sever, cuma öğleden sonraları tercih ediyor.")}</p></div>
      <ul className={m.timeline}><li><i />{t("Saç kesimi")} · Elif <small>{t("12 Eyl")}</small></li><li><i />{t("Boya + fön")} · Elif <small>{t("28 Ağu")}</small></li></ul>
    </Frame>
  );
}

export async function CheckoutMockup() {
  const t = await getT();
  return (
    <Frame title={t("Kasa & Operasyon")}>
      <ul className={m.lines}>
        <li><span>{t("Saç kesimi")}</span><b>₺450</b></li>
        <li><span>{t("Bakım şampuanı ×1")}</span><b>₺220</b></li>
        <li className={m.disc}><span>{t("İndirim")}</span><b>−₺50</b></li>
      </ul>
      <div className={m.total}><span>{t("Toplam")}</span><b>₺620</b></div>
      <div className={m.pay}><span className={m.payOn}><CreditCard size={13} /> {t("Kart")}</span><span><Wallet size={13} /> {t("Nakit")}</span></div>
      <div className={m.pkg}><Package size={15} /><div><b>{t("Cilt bakımı paketi")}</b><small>{t("Kalan {left} / {total} seans", { left: 4, total: 10 })}</small></div><span className={m.pkgBar}><i style={{ width: "60%" }} /></span></div>
    </Frame>
  );
}

export async function AnalyticsMockup() {
  const t = await getT();
  const bars = [42, 58, 51, 74, 66, 88, 61];
  return (
    <Frame title={t("Analiz & Büyüme")}>
      <div className={m.kpis}><span><small>{t("Doluluk")}</small><b>{t("%{value}", { value: 78 })}</b></span><span><small>{t("Randevu")}</small><b>126</b></span><span><small>{t("İptal")}</small><b>{t("%{value}", { value: 4 })}</b></span></div>
      <div className={m.chart}>
        {bars.map((v, i) => <span key={i} style={{ height: `${v}%`, ["--d" as string]: `${i * 60}ms` } as CSSProperties} className={i === 5 ? m.barTop : ""} />)}
      </div>
      <div className={m.chartAxis}>{[tk("Pt"), tk("Sa"), tk("Ça"), tk("Pe"), tk("Cu"), tk("Ct"), tk("Pz")].map((d) => <span key={d}>{t(d)}</span>)}</div>
    </Frame>
  );
}

export async function FieldsMockup() {
  const t = await getT();
  return (
    <Frame title={t("Randevu formu · özel alanlar")}>
      <div className={m.field}><label>{t("Kişi sayısı")} <em>*</em></label><div className={m.stepper}><span>−</span><b>2</b><span>+</span></div></div>
      <div className={m.field}><label><PawPrint size={12} /> {t("Evcil hayvan türü")}</label><div className={m.select}>{t("Kedi")} <ChevronRight size={13} /></div></div>
      <div className={m.field}><label>{t("Notunuz")}</label><div className={m.textarea}>{t("Kapıya yakın bir koltuk rica ederim.")}</div></div>
      <div className={m.check}><span className={m.checkBox}><Check size={11} /></span>{t("İlk ziyaretim")}</div>
    </Frame>
  );
}

export async function AppsMockup() {
  const t = await getT();
  return (
    <div className={m.duo} role="img" aria-label={t("iPhone ve Android işletme uygulaması — örnek ekran görünümü")}>
      <div className={`${m.phone} ${m.phoneBack}`} aria-hidden="true">
        <div className={m.phoneScreen}>
          <span className={m.punch} />
          <div className={m.phoneHead}><small>ANDROID</small><b>{t("Bugün")}</b></div>
          <div className={m.miniList}>{[t("10:00 · Elif · Saç kesimi"), t("11:30 · Mert · Sakal"), t("13:15 · Zeynep · Cilt")].map((line) => <span key={line}><Clock3 size={11} />{line}</span>)}</div>
        </div>
      </div>
      <div className={m.phone} aria-hidden="true">
        <div className={m.phoneScreen}>
          <span className={m.island} />
          <div className={m.phoneHead}><small>{t("İŞLETME MERKEZİ")}</small><b>{t("Günaydın")} 👋</b></div>
          <div className={m.appKpi}><span><small>{t("Bugün")}</small><b>{t("{count} randevu", { count: 9 })}</b></span><span><small>{t("Sırada")}</small><b>{t("{count} kişi", { count: 3 })}</b></span></div>
          <div className={m.miniList}>{[t("Yeni randevu · 11:30"), t("Ödeme alındı · ₺450"), t("Yorum geldi · 5★")].map((line) => <span key={line}><Check size={11} />{line}</span>)}</div>
          <div className={m.tabbar}><CalendarCheck2 size={15} /><UsersRound size={15} /><Smartphone size={15} /><CircleUserRound size={15} /></div>
        </div>
      </div>
    </div>
  );
}
