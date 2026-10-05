"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft, ArrowRight, BadgeCheck, BarChart3, BriefcaseBusiness, CalendarCheck2,
  Check, ChevronRight, Clock3, Goal, HeartHandshake, Scissors, Sparkles,
  Store, Target, UsersRound, UserRound, WandSparkles, Zap,
  type LucideIcon,
} from "lucide-react";
import { RegisterForm } from "@/features/auth/auth-forms";
import { listDynamicCategories } from "@/features/categories/category-request-repository";
import {
  readBusinessOnboardingDraft,
  writeBusinessOnboardingDraft,
  type BusinessOnboardingDraft,
} from "@/features/businesses/onboarding-draft";
import { RoviMascot } from "@/components/brand/rovi-mascot";

const BASE_CATEGORIES = [
  ["kuafor", "Kuaför", "Saç, bakım ve stil", Scissors],
  ["berber", "Berber", "Erkek bakım hizmetleri", Scissors],
  ["guzellik", "Güzellik Merkezi", "Bakım ve güzellik", Sparkles],
  ["nail", "Nail Studio", "Tırnak ve el bakımı", WandSparkles],
  ["spor", "Spor & PT", "Antrenman ve koçluk", Zap],
  ["danismanlik", "Danışmanlık", "Profesyonel görüşmeler", BriefcaseBusiness],
  ["veteriner", "Veteriner", "Hayvan sağlığı", HeartHandshake],
  ["saglik", "Sağlık", "Klinik ve uzmanlık", BadgeCheck],
  ["egitim", "Eğitim", "Ders ve atölyeler", Goal],
  ["servis", "Servis", "Teknik ve saha hizmetleri", Store],
  ["diger", "Diğer", "Size özel işletme", Target],
] as const;

const GOALS = [
  { id: "online-booking", title: "Daha fazla online randevu", text: "Müşterilerim 7/24 randevu alabilsin", icon: CalendarCheck2 },
  { id: "organize", title: "Günümü düzenlemek", text: "Takvim, ekip ve molalar tek yerde olsun", icon: Clock3 },
  { id: "customers", title: "Müşterilerimi büyütmek", text: "Yeni ve tekrar gelen müşterileri artırmak", icon: UsersRound },
  { id: "revenue", title: "Gelirimi takip etmek", text: "Kasa, paket ve performansı görmek", icon: BarChart3 },
  { id: "no-show", title: "Gelmemeyi azaltmak", text: "Hatırlatma ve teyit akışlarını kullanmak", icon: BadgeCheck },
  { id: "brand", title: "Markamı öne çıkarmak", text: "Keşfet'te profesyonel bir vitrin oluşturmak", icon: Sparkles },
] as const;

const MANAGERS = [
  { id: "owner" as const, title: "Randevuları ben yöneteceğim", text: "Tek kişilik veya sahibi tarafından yönetilen işletme", icon: UserRound },
  { id: "team" as const, title: "Ben ve personelim yöneteceğiz", text: "Çalışan takvimi, yetkiler ve ekip müsaitliği", icon: UsersRound },
];

const VOLUMES = [
  { id: "0-5" as const, title: "0–5", text: "Günde birkaç randevu" },
  { id: "6-10" as const, title: "6–10", text: "Düzenli bir günlük akış" },
  { id: "11-20" as const, title: "11–20", text: "Yoğun işletme temposu" },
  { id: "21+" as const, title: "21+", text: "Yüksek hacimli operasyon" },
];

const STEP_TITLES = ["Kategori", "Hedefler", "Ekip", "Randevu hacmi", "Online randevu", "İşletme", "Hesap"];

interface SignupCategory {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

function slugify(value: string) {
  return value.toLocaleLowerCase("tr-TR").trim()
    .replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u")
    .replace(/ö/g, "o").replace(/ç/g, "c").replace(/ı/g, "i")
    .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

export function BusinessSignupWizard() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Partial<BusinessOnboardingDraft>>({});
  const [categories, setCategories] = useState<SignupCategory[]>(BASE_CATEGORIES.map(([value, label, description, icon]) => ({ value, label, description, icon })));
  const progress = Math.round(((step + 1) / STEP_TITLES.length) * 100);

  useEffect(() => {
    queueMicrotask(() => setDraft(readBusinessOnboardingDraft()));
    listDynamicCategories().then((rows) => {
      setCategories((current) => {
        const known = new Set(current.map((item) => item.value));
        const custom = rows.filter((row) => !known.has(row.slug)).map((row) => ({ value: row.slug, label: row.label, description: "Randevulu hizmet işletmesi", icon: Store }));
        return [...current.slice(0, -1), ...custom, current[current.length - 1]!];
      });
    }).catch(() => undefined);
  }, []);

  function update(values: Partial<BusinessOnboardingDraft>) {
    setDraft((current) => {
      const next = { ...current, ...values };
      writeBusinessOnboardingDraft(next);
      return next;
    });
  }

  function chooseAndAdvance(values: Partial<BusinessOnboardingDraft>) {
    update(values);
    window.setTimeout(() => setStep((current) => Math.min(current + 1, STEP_TITLES.length - 1)), 180);
  }

  function next() {
    if (step === 1 && !draft.goals?.length) return;
    if (step === 5 && (!draft.name?.trim() || !draft.slug?.trim() || !draft.city?.trim() || !draft.phone?.trim())) return;
    setStep((current) => Math.min(current + 1, STEP_TITLES.length - 1));
  }

  const selectedCategory = useMemo(() => categories.find((item) => item.value === draft.category), [categories, draft.category]);

  return (
    <main className="business-signup-stage">
      <header className="business-signup-header">
        <Link href="/" aria-label="Ana sayfa"><Image src="/logo.png" alt="" width={42} height={42}/><b>Senin<span>Randevun</span></b></Link>
        <div><small>İLK 3 AY ÜCRETSİZ</small><span><BadgeCheck size={14}/> Kredi kartı gerekmez</span></div>
      </header>

      <section className="business-signup-shell">
        <aside className="business-signup-rail">
          <div className="signup-rovi"><RoviMascot size={78} alt="Rovi" /><span><small>ROVİ · KURULUM KOÇUN</small><b>İşletmeni birlikte hazırlayalım.</b></span></div>
          <ol>{STEP_TITLES.map((title, index) => <li key={title} className={index === step ? "active" : index < step ? "done" : ""}><i>{index < step ? <Check size={14}/> : index + 1}</i><span><b>{title}</b><small>{index < step ? "Tamamlandı" : index === step ? "Şimdi buradasın" : "Bir sonraki adım"}</small></span></li>)}</ol>
          <div className="signup-rail-note"><Sparkles size={17}/><p><b>Akıllı başlangıç</b><span>Yanıtların panelini ve önerilerini işletmene göre hazırlar.</span></p></div>
        </aside>

        <div className="business-signup-main">
          <div className="signup-mobile-top"><Link href="/"><Image src="/logo.png" alt="" width={34} height={34}/><b>SeninRandevun</b></Link><span>{step + 1}/{STEP_TITLES.length}</span></div>
          <div className="signup-progress"><i style={{ width: `${progress}%` }}/></div>
          <div className="signup-topline"><button type="button" onClick={() => step > 0 ? setStep(step - 1) : history.back()} aria-label="Geri"><ArrowLeft size={21}/></button><span>ADIM {step + 1} / {STEP_TITLES.length}</span><small>%{progress} tamamlandı</small></div>

          <div key={step} className="signup-step">
            {step === 0 && <>
              <StepHeading eyebrow="SENİ TANIYALIM" title="İşletmen hangi kategoride?" text="Doğru kategori; hizmet, takvim ve mağaza önerilerini sana göre hazırlar."/>
              <div className="signup-option-grid category-grid">{categories.map(({ value, label, description, icon: Icon }) => <button type="button" key={value} className={draft.category === value ? "selected" : ""} onClick={() => chooseAndAdvance({ category: value })}><i><Icon size={22}/></i><span><b>{label}</b><small>{description}</small></span><ChevronRight size={18}/></button>)}</div>
            </>}

            {step === 1 && <>
              <StepHeading eyebrow="HEDEFİNİ BELİRLE" title="SeninRandevun sana ne kazandırsın?" text="Birden fazla hedef seçebilirsin. Rovi önerilerini bu önceliklere göre sıralayacak."/>
              <div className="signup-option-grid goals-grid">{GOALS.map(({ id, title, text, icon: Icon }) => { const selected = draft.goals?.includes(id); return <button type="button" key={id} className={selected ? "selected" : ""} onClick={() => update({ goals: selected ? draft.goals?.filter((item) => item !== id) : [...(draft.goals ?? []), id] })}><i><Icon size={21}/></i><span><b>{title}</b><small>{text}</small></span><em>{selected && <Check size={15}/>}</em></button>; })}</div>
              <StepAction disabled={!draft.goals?.length} onClick={next}>Hedeflerim hazır <ArrowRight size={17}/></StepAction>
            </>}

            {step === 2 && <>
              <StepHeading eyebrow="ÇALIŞMA ŞEKLİN" title="Randevuları kim yönetecek?" text="Buna göre çalışan yetkilerini ve takvim görünümünü başlangıçta hazırlarız."/>
              <div className="signup-option-stack">{MANAGERS.map(({ id, title, text, icon: Icon }) => <button type="button" key={id} className={draft.appointmentManagers === id ? "selected" : ""} onClick={() => chooseAndAdvance({ appointmentManagers: id })}><i><Icon size={25}/></i><span><b>{title}</b><small>{text}</small></span><ChevronRight size={19}/></button>)}</div>
            </>}

            {step === 3 && <>
              <StepHeading eyebrow="GÜNLÜK TEMPO" title="Günde ortalama kaç randevu alıyorsunuz?" text="Yoğunluğunu bilmek; takvim aralığını, kapasite önerilerini ve raporları kişiselleştirir."/>
              <div className="signup-volume-grid">{VOLUMES.map(({ id, title, text }) => <button type="button" key={id} className={draft.dailyAppointmentVolume === id ? "selected" : ""} onClick={() => chooseAndAdvance({ dailyAppointmentVolume: id })}><b>{title}</b><span>{text}</span></button>)}</div>
            </>}

            {step === 4 && <>
              <StepHeading eyebrow="ONLINE RANDEVU" title="Müşteriler kendi randevularını oluşturabilsin mi?" text="Bu ayarı daha sonra panelden değiştirebilirsin."/>
              <div className="signup-booking-choice"><button type="button" className={draft.allowOnlineBooking === true ? "selected" : ""} onClick={() => chooseAndAdvance({ allowOnlineBooking: true })}><i><CalendarCheck2 size={28}/></i><b>Evet, 7/24 randevu alayım</b><span>Müşteriler uygun saatleri görüp mağaza sayfandan randevu oluşturabilir.</span><em>ÖNERİLEN</em></button><button type="button" className={draft.allowOnlineBooking === false ? "selected" : ""} onClick={() => chooseAndAdvance({ allowOnlineBooking: false })}><i><UserRound size={28}/></i><b>Hayır, sadece ben oluşturacağım</b><span>Randevuları şimdilik yalnızca yönetim panelinden ekleyebilirsin.</span></button></div>
            </>}

            {step === 5 && <>
              <StepHeading eyebrow="MAĞAZANI OLUŞTURALIM" title="Müşterilerin seni kolayca bulsun." text="İşletme adını ve sana özel online randevu adresini belirle."/>
              <div className="signup-business-form">
                <label><span>İşletme adı</span><input value={draft.name ?? ""} onChange={(event) => { const name = event.target.value; update({ name, slug: draft.slug && draft.slug !== slugify(draft.name ?? "") ? draft.slug : slugify(name) }); }} placeholder={selectedCategory ? `Örn: ${selectedCategory.label} işletmem` : "İşletme adın"}/></label>
                <label><span>Online randevu adresi</span><div className="slug-field"><b>seninrandevun.com/</b><input value={draft.slug ?? ""} onChange={(event) => update({ slug: slugify(event.target.value) })} placeholder="isletme-adiniz"/></div><small>Türkçe karakterler otomatik olarak güvenli bağlantıya çevrilir.</small></label>
                <div><label><span>Şehir</span><input value={draft.city ?? ""} onChange={(event) => update({ city: event.target.value })} placeholder="İstanbul"/></label><label><span>İşletme telefonu</span><div className="phone-field"><b>+90</b><input inputMode="tel" value={draft.phone ?? ""} onChange={(event) => update({ phone: event.target.value.replace(/[^0-9\s]/g, "").slice(0, 13) })} placeholder="5XX XXX XX XX"/></div></label></div>
              </div>
              <StepAction disabled={!draft.name?.trim() || (draft.slug?.length ?? 0) < 3 || !draft.city?.trim() || (draft.phone?.replace(/\D/g, "").length ?? 0) < 10} onClick={next}>Hesabımı oluşturmaya geç <ArrowRight size={17}/></StepAction>
            </>}

            {step === 6 && <>
              <StepHeading eyebrow="SON ADIM" title="Çalışma alanını güvene al." text="Hesabını oluştur; e-posta doğrulamasından sonra mağaza bilgilerin hazır gelecek."/>
              <div className="signup-account-summary"><span><Store size={18}/><p><b>{draft.name}</b><small>{selectedCategory?.label} · {draft.city}</small></p></span><button type="button" onClick={() => setStep(5)}>Düzenle</button></div>
              <div className="signup-register-embed"><RegisterForm accountType="business" embedded/></div>
            </>}
          </div>
        </div>
      </section>
      <footer className="business-signup-footer"><span><BadgeCheck size={14}/> 90 gün tüm özellikler açık</span><span><Zap size={14}/> Birkaç dakikada hazır</span><Link href="/isletmeler/giris">Zaten hesabın var mı? Giriş yap</Link></footer>
    </main>
  );
}

function StepHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <header className="signup-step-heading"><span>{eyebrow}</span><h1>{title}</h1><p>{text}</p></header>;
}

function StepAction({ children, disabled, onClick }: { children: ReactNode; disabled?: boolean; onClick: () => void }) {
  return <div className="signup-step-action"><button type="button" disabled={disabled} onClick={onClick}>{children}</button></div>;
}
