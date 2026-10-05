import { Bell, CalendarCheck2, Check, ChevronRight, CircleUserRound, Clock3, CreditCard, Crown, MessageSquareText, Package, PawPrint, Plus, ShieldCheck, Smartphone, Star, UserRound, UsersRound, Wallet } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import m from "./feature-mockups.module.css";

/* Tüm görseller temsilîdir: isimler, saatler ve tutarlar örnek veridir. */

function Frame({ title, children, tone = "light" }: { title: string; children: ReactNode; tone?: "light" | "dark" }) {
  return (
    <div className={`${m.frame} ${tone === "dark" ? m.frameDark : ""}`} role="img" aria-label={`${title} — örnek ekran görünümü`}>
      <div className={m.frameBar} aria-hidden="true"><i /><i /><i /><span>{title}</span></div>
      <div className={m.frameBody} aria-hidden="true">{children}</div>
    </div>
  );
}

export function CalendarMockup() {
  const staff = [
    { name: "Elif", items: [{ top: 6, h: 26, t: "Saç kesimi", c: m.tGreen }, { top: 40, h: 34, t: "Boya + fön", c: m.tLime }] },
    { name: "Mert", items: [{ top: 18, h: 22, t: "Sakal tıraşı", c: m.tSky }, { top: 58, h: 26, t: "Saç kesimi", c: m.tGreen }] },
    { name: "Zeynep", items: [{ top: 2, h: 40, t: "Cilt bakımı", c: m.tAmber }, { top: 66, h: 20, t: "Mola", c: m.tMuted }] },
  ];
  return (
    <Frame title="Takvim · Bugün">
      <div className={m.calHead}><b>Salı</b><span>Gün</span><span className={m.on}>Hafta</span><span>Ay</span></div>
      <div className={m.cal}>
        <div className={m.calHours}>{["09", "10", "11", "12", "13"].map((h) => <span key={h}>{h}:00</span>)}</div>
        {staff.map((s) => (
          <div key={s.name} className={m.calCol}>
            <b>{s.name}</b>
            <div className={m.calTrack}>
              {s.items.map((item) => <span key={item.t + item.top} className={`${m.calItem} ${item.c}`} style={{ top: `${item.top}%`, height: `${item.h}%` }}>{item.t}</span>)}
            </div>
          </div>
        ))}
        <span className={m.nowLine} style={{ top: "52%" }} />
      </div>
      <div className={m.toast}><Check size={13} /> Çakışma yok · saat uygun</div>
    </Frame>
  );
}

export function BookingMockup() {
  return (
    <div className={m.phone} role="img" aria-label="Online randevu akışı — örnek ekran görünümü">
      <div className={m.phoneScreen} aria-hidden="true">
        <span className={m.island} />
        <div className={m.phoneHead}><small>ADIM 3 / 4</small><b>Saat seçin</b></div>
        <div className={m.steps}><i className={m.done} /><i className={m.done} /><i className={m.cur} /><i /></div>
        <div className={m.pickCard}><span className={m.avatar}>E</span><div><b>Saç kesimi · 45 dk</b><small>Elif ile</small></div></div>
        <div className={m.days}>{[["Pzt", "12"], ["Sal", "13"], ["Çar", "14"], ["Per", "15"]].map(([d, n], i) => <span key={d} className={i === 1 ? m.dayOn : ""}><small>{d}</small><b>{n}</b></span>)}</div>
        <div className={m.slots}>{["10:00", "10:45", "11:30", "13:15", "14:00", "15:30"].map((s, i) => <span key={s} className={i === 2 ? m.slotOn : i === 4 ? m.slotOff : ""}>{s}</span>)}</div>
        <span className={m.phoneCta}>Randevuyu onayla <ChevronRight size={14} /></span>
      </div>
    </div>
  );
}

export function ReminderMockup() {
  return (
    <div className={m.notifyStage} role="img" aria-label="SMS ve anlık bildirim hatırlatmaları — örnek görünüm">
      <div aria-hidden="true" className={m.notifyStack}>
        <div className={`${m.notify} ${m.n1}`}>
          <span className={m.appIcon}><CalendarCheck2 size={16} /></span>
          <div><b>SeninRandevun <small>şimdi</small></b><p>Randevunuza 1 saat kaldı · 14:00 Saç kesimi</p></div>
        </div>
        <div className={`${m.notify} ${m.n2}`}>
          <span className={`${m.appIcon} ${m.smsIcon}`}><MessageSquareText size={16} /></span>
          <div><b>SMS <small>09:12</small></b><p>Randevunuz onaylandı. Değişiklik için bağlantıyı kullanabilirsiniz.</p></div>
        </div>
        <div className={`${m.notify} ${m.n3}`}>
          <span className={`${m.appIcon} ${m.bizIcon}`}><Bell size={16} /></span>
          <div><b>İşletme paneli <small>1 dk</small></b><p>Yeni randevu: Ayşe K. · Perşembe 11:30</p></div>
        </div>
      </div>
    </div>
  );
}

export function QueueMockup() {
  const rows = [["A12", "Burak T.", "Şimdi", m.qNow], ["A13", "Selin A.", "~10 dk", ""], ["A14", "Kaan D.", "~25 dk", ""], ["A15", "Deniz Y.", "~40 dk", ""]];
  return (
    <Frame title="Canlı sıra" tone="dark">
      <div className={m.qHead}><span className={m.live}><i /> CANLI</span><b>4 kişi bekliyor</b></div>
      <ul className={m.queue}>
        {rows.map(([no, name, eta, cls]) => <li key={no} className={cls}><b>{no}</b><span>{name}</span><small>{eta}</small></li>)}
      </ul>
      <div className={m.qActions}><span>Sıradakini çağır</span><span>Müşteri ekle <Plus size={12} /></span></div>
    </Frame>
  );
}

export function TeamMockup() {
  const roles = [
    { icon: Crown, name: "İşletme Sahibi", text: "Abonelik, üyeler, kritik ayarlar" },
    { icon: ShieldCheck, name: "Yönetici", text: "Randevular, ekip, hizmetler, ayarlar" },
    { icon: UsersRound, name: "Müdür", text: "Günlük operasyon, takvim, CRM" },
    { icon: UserRound, name: "Çalışan", text: "Kendi randevuları ve takvimi" },
  ];
  return (
    <Frame title="Ekip ve yetkiler">
      <ul className={m.roles}>
        {roles.map(({ icon: Icon, name, text }, i) => <li key={name}><span className={m.roleIcon}><Icon size={15} /></span><div><b>{name}</b><small>{text}</small></div><i className={i < 2 ? m.toggleOn : m.toggle} /></li>)}
      </ul>
    </Frame>
  );
}

export function CrmMockup() {
  return (
    <Frame title="Müşteri kartı">
      <div className={m.crmHead}><span className={m.avatarLg}>AK</span><div><b>Ayşe K.</b><small>Müşteri · 14 ziyaret</small></div><span className={m.badge}><Star size={11} /> Sadık</span></div>
      <div className={m.crmStats}><span><b>14</b><small>Ziyaret</small></span><span><b>2</b><small>Yaklaşan</small></span><span><b>6/10</b><small>Paket seansı</small></span></div>
      <div className={m.note}><small>NOT</small><p>Kısa kesim sever, cuma öğleden sonraları tercih ediyor.</p></div>
      <ul className={m.timeline}><li><i />Saç kesimi · Elif <small>12 Eyl</small></li><li><i />Boya + fön · Elif <small>28 Ağu</small></li></ul>
    </Frame>
  );
}

export function CheckoutMockup() {
  return (
    <Frame title="Kasa & Operasyon">
      <ul className={m.lines}>
        <li><span>Saç kesimi</span><b>₺450</b></li>
        <li><span>Bakım şampuanı ×1</span><b>₺220</b></li>
        <li className={m.disc}><span>İndirim</span><b>−₺50</b></li>
      </ul>
      <div className={m.total}><span>Toplam</span><b>₺620</b></div>
      <div className={m.pay}><span className={m.payOn}><CreditCard size={13} /> Kart</span><span><Wallet size={13} /> Nakit</span></div>
      <div className={m.pkg}><Package size={15} /><div><b>Cilt bakımı paketi</b><small>Kalan 4 / 10 seans</small></div><span className={m.pkgBar}><i style={{ width: "60%" }} /></span></div>
    </Frame>
  );
}

export function AnalyticsMockup() {
  const bars = [42, 58, 51, 74, 66, 88, 61];
  return (
    <Frame title="Analiz & Büyüme">
      <div className={m.kpis}><span><small>Doluluk</small><b>%78</b></span><span><small>Randevu</small><b>126</b></span><span><small>İptal</small><b>%4</b></span></div>
      <div className={m.chart}>
        {bars.map((v, i) => <span key={i} style={{ height: `${v}%`, ["--d" as string]: `${i * 60}ms` } as CSSProperties} className={i === 5 ? m.barTop : ""} />)}
      </div>
      <div className={m.chartAxis}>{["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"].map((d) => <span key={d}>{d}</span>)}</div>
    </Frame>
  );
}

export function FieldsMockup() {
  return (
    <Frame title="Randevu formu · özel alanlar">
      <div className={m.field}><label>Kişi sayısı <em>*</em></label><div className={m.stepper}><span>−</span><b>2</b><span>+</span></div></div>
      <div className={m.field}><label><PawPrint size={12} /> Evcil hayvan türü</label><div className={m.select}>Kedi <ChevronRight size={13} /></div></div>
      <div className={m.field}><label>Notunuz</label><div className={m.textarea}>Kapıya yakın bir koltuk rica ederim.</div></div>
      <div className={m.check}><span className={m.checkBox}><Check size={11} /></span>İlk ziyaretim</div>
    </Frame>
  );
}

export function AppsMockup() {
  return (
    <div className={m.duo} role="img" aria-label="iPhone ve Android işletme uygulaması — örnek ekran görünümü">
      <div className={`${m.phone} ${m.phoneBack}`} aria-hidden="true">
        <div className={m.phoneScreen}>
          <span className={m.punch} />
          <div className={m.phoneHead}><small>ANDROID</small><b>Bugün</b></div>
          <div className={m.miniList}>{["10:00 · Elif · Saç kesimi", "11:30 · Mert · Sakal", "13:15 · Zeynep · Cilt"].map((t) => <span key={t}><Clock3 size={11} />{t}</span>)}</div>
        </div>
      </div>
      <div className={m.phone} aria-hidden="true">
        <div className={m.phoneScreen}>
          <span className={m.island} />
          <div className={m.phoneHead}><small>İŞLETME MERKEZİ</small><b>Günaydın 👋</b></div>
          <div className={m.appKpi}><span><small>Bugün</small><b>9 randevu</b></span><span><small>Sırada</small><b>3 kişi</b></span></div>
          <div className={m.miniList}>{["Yeni randevu · 11:30", "Ödeme alındı · ₺450", "Yorum geldi · 5★"].map((t) => <span key={t}><Check size={11} />{t}</span>)}</div>
          <div className={m.tabbar}><CalendarCheck2 size={15} /><UsersRound size={15} /><Smartphone size={15} /><CircleUserRound size={15} /></div>
        </div>
      </div>
    </div>
  );
}
