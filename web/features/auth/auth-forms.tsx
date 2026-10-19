"use client";

import Image from "next/image";
import Link from "@/i18n/link";
import { useRouter } from "@/i18n/navigation";
import {
  FormEvent,
  Fragment,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { FirebaseError } from "firebase/app";
import { toast } from "sonner";
import { httpsCallable } from "firebase/functions";
import { getFunctions } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";
import {
  loginWithEmailPassword,
  registerWithEmailPassword,
  signInWithSocial,
  AccountExistsError,
  PROVIDER_LABEL,
  type SocialProvider,
} from "@/features/auth/auth-service";
import { getPlatformSettings } from "@/features/platform/platform-settings-repository";
import { useAuth } from "@/hooks/use-auth";
import { RoviMascot, type RoviMood } from "@/components/brand/rovi-mascot";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BellRing,
  Building2,
  CalendarCheck2,
  Check,
  CheckCircle2,
  Clock3,
  Compass,
  CreditCard,
  Eye,
  EyeOff,
  Gift,
  Heart,
  KeyRound,
  LockKeyhole,
  Mail,
  MailCheck,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  UserRound,
  UsersRound,
  Zap,
  type LucideIcon,
} from "lucide-react";
import s from "./auth.module.css";
import { useT } from "@/i18n/client";
import { tk, type TFunction } from "@/i18n/config";

const PRIMARY_ADMIN_EMAIL = "cihatwin@gmail.com";

type AccountType = "business" | "customer";

// Apple web girişi Firebase'de Services ID (com.cihat.seninrandevun.web) ile yapılandırıldı.
// Acil durumda NEXT_PUBLIC_APPLE_SIGNIN_ENABLED=0 ile kapatılabilir.
const APPLE_WEB_SIGNIN_ENABLED = process.env.NEXT_PUBLIC_APPLE_SIGNIN_ENABLED !== "0";
type ScreenMode = "login" | "register" | "forgot";

function getCloudFunctions() {
  return getFunctions(getFirebaseApp(), "europe-west1");
}

function mapAuthError(error: unknown, t: TFunction): string {
  const code = (error as FirebaseError | undefined)?.code;

  const mapper: Record<string, string> = {
    "auth/invalid-credential": tk("E-posta veya şifre hatalı."),
    "auth/configuration-not-found": tk("Firebase Authentication'da Email/Password provider aktif değil. Firebase Console > Authentication > Sign-in method bölümünden Email/Password'ü açın."),
    "auth/user-not-found": tk("Bu e-posta ile kayıtlı kullanıcı bulunamadı."),
    "auth/wrong-password": tk("Şifre hatalı."),
    "auth/email-already-in-use": tk("Bu e-posta zaten kullanılıyor."),
    "auth/weak-password": tk("Şifre en az 8 karakter olmalı."),
    "auth/invalid-email": tk("E-posta formatı geçersiz."),
    "auth/network-request-failed": tk("Ağ hatası oluştu. İnternet bağlantınızı kontrol edin."),
    "auth/too-many-requests": tk("Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin."),
    "auth/account-exists-with-different-credential": tk("Bu e-posta başka bir giriş yöntemiyle kayıtlı. Önce o yöntemle (örn. e-posta ve şifre) giriş yapın."),
    "auth/unauthorized-domain": tk("Bu alan adı Firebase'de yetkili değil. Firebase Console > Authentication > Settings > Authorized domains listesine ekleyin."),
    "auth/operation-not-allowed": tk("Bu giriş yöntemi şu anda kapalı."),
    "auth/invalid-oauth-client-id": tk("Apple ile giriş web için henüz yapılandırılmamış."),
    "auth/invalid-credential-or-provider-id": tk("Giriş sağlayıcısı yapılandırması hatalı."),
    "auth/user-disabled": tk("Bu hesap devre dışı bırakılmış."),
  };

  if (code && mapper[code]) return t(mapper[code]);

  const message = (error as Error | undefined)?.message;
  if (message?.includes("Firebase istemci konfigurasyonu eksik")) {
    return t("Firebase web konfigurasyonu eksik. .env.local dosyasını kontrol edin.");
  }

  return message ? t(message) : t("Beklenmeyen bir hata oluştu.");
}

/* ─────────────────── UI yardımcıları (yalnız görsel) ─────────────────── */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function emailError(value: string, t: TFunction): string | undefined {
  if (!value.trim()) return t("E-posta adresini yaz.");
  if (!EMAIL_PATTERN.test(value.trim())) return t("Geçerli bir e-posta adresi yaz (ör. ad@ornek.com).");
  return undefined;
}

/** Çevrilmiş metindeki <etiket>…</etiket> parçalarını React öğelerine çevirir (ör. <em>, bağlantılar). */
function rich(text: string, tags: Record<string, (chunk: string) => ReactNode> = { em: (chunk) => <em>{chunk}</em> }): ReactNode {
  const parts = text.split(/<(\w+)>(.*?)<\/\1>/);
  const out: ReactNode[] = [];
  for (let index = 0; index < parts.length; index += 3) {
    if (parts[index]) out.push(parts[index]);
    const tag = parts[index + 1];
    if (tag !== undefined) {
      const render = tags[tag];
      out.push(<Fragment key={index}>{render ? render(parts[index + 2] ?? "") : parts[index + 2]}</Fragment>);
    }
  }
  return out;
}

function cx(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(" ");
}

function focusById(id: string | undefined) {
  if (!id) return;
  document.getElementById(id)?.focus();
}

/** Mevcut ?next= parametresini Giriş ↔ Kayıt geçişlerinde korur (yalnız bağlantı metni; yönlendirme getSafeNextPath ile yapılır). */
function useCarriedQuery() {
  const [query, setQuery] = useState("");
  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next");
    if (next) queueMicrotask(() => setQuery(`?next=${encodeURIComponent(next)}`));
  }, []);
  return query;
}

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  id: string;
  label: string;
  icon: LucideIcon;
  error?: string;
  hint?: ReactNode;
  valid?: boolean;
  labelAside?: ReactNode;
};

function TextField({ id, label, icon: Icon, error, hint, valid, labelAside, ...input }: FieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={s.field}>
      <div className={s.labelRow}>
        <label className={s.label} htmlFor={id}>{label}</label>
        {labelAside}
      </div>
      <div className={s.control} data-invalid={error ? "true" : undefined} data-valid={valid && !error ? "true" : undefined}>
        <Icon size={18} aria-hidden="true" />
        <input id={id} className={s.input} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...input} />
        <CheckCircle2 className={s.validIcon} size={18} aria-hidden="true" />
      </div>
      {error ? <p id={errorId} className={s.error}><AlertCircle size={14} aria-hidden="true" />{error}</p> : null}
      {hint ? <div id={hintId} className={s.hint}>{hint}</div> : null}
    </div>
  );
}

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "type"> & {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  labelAside?: ReactNode;
};

function PasswordField({ id, label, error, hint, labelAside, onBlur, ...input }: PasswordFieldProps) {
  const t = useT();
  const [visible, setVisible] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const capsId = `${id}-caps`;
  const describedBy = [error ? errorId : null, capsOn ? capsId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  function detectCaps(event: KeyboardEvent<HTMLInputElement>) {
    if (typeof event.getModifierState === "function") setCapsOn(event.getModifierState("CapsLock"));
  }

  return (
    <div className={s.field}>
      <div className={s.labelRow}>
        <label className={s.label} htmlFor={id}>{label}</label>
        {labelAside}
      </div>
      <div className={s.control} data-invalid={error ? "true" : undefined}>
        <LockKeyhole size={18} aria-hidden="true" />
        <input
          id={id}
          className={s.input}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onKeyDown={detectCaps}
          onKeyUp={detectCaps}
          onBlur={(event) => { setCapsOn(false); onBlur?.(event); }}
          {...input}
        />
        <button
          type="button"
          className={s.toggle}
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? t("Şifreyi gizle") : t("Şifreyi göster")}
          aria-pressed={visible}
          aria-controls={id}
        >
          {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
          <span aria-hidden="true">{visible ? t("Gizle") : t("Göster")}</span>
        </button>
      </div>
      {capsOn ? <p id={capsId} className={s.caps} role="status"><AlertCircle size={14} aria-hidden="true" />{t("Caps Lock açık")}</p> : null}
      {error ? <p id={errorId} className={s.error}><AlertCircle size={14} aria-hidden="true" />{error}</p> : null}
      {hint ? <div id={hintId} className={s.hint}>{hint}</div> : null}
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const t = useT();
  // Mevcut kayıt formundaki güç hesabı aynen korunur.
  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 8 ? 2 : /(?=.*[A-Z])(?=.*[0-9])/.test(password) ? 4 : 3;
  const strengthLabel = ["", t("Çok zayıf"), t("Zayıf"), t("Orta"), t("Güçlü")];
  const tip = strength === 0
    ? t("En az 8 karakter kullan.")
    : strength < 3
      ? t("{count} karakter daha ekle.", { count: Math.max(0, 8 - password.length) })
      : strength === 3
        ? t("Büyük harf ve rakam ekleyerek güçlendir.")
        : t("Harika, şifren güçlü.");
  return (
    <div className={s.strength} data-level={strength}>
      <div className={s.bars} aria-hidden="true"><i /><i /><i /><i /></div>
      <div className={s.strengthText} aria-live="polite">
        <span>{t("Şifre gücü:")} <b>{strength ? strengthLabel[strength] : "—"}</b></span>
        <span>{tip}</span>
      </div>
    </div>
  );
}

function SubmitButton({ loading, loadingText, children, disabled, onClick, type = "submit" }: { loading: boolean; loadingText: string; children: ReactNode; disabled?: boolean; onClick?: () => void; type?: "submit" | "button" }) {
  return (
    <button className={s.submit} type={type} disabled={loading || disabled} onClick={onClick} aria-busy={loading || undefined}>
      {loading ? <><span className={s.spinner} aria-hidden="true" />{loadingText}</> : children}
    </button>
  );
}

function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className={s.alert} role="alert"><AlertCircle size={17} aria-hidden="true" /><span>{message}</span></div>;
}

function Segmented({ accountType, active }: { accountType: AccountType; active: "login" | "register" }) {
  const t = useT();
  const carried = useCarriedQuery();
  const customer = accountType === "customer";
  const loginHref = customer ? `/musteri/giris${carried}` : "/isletmeler/giris";
  const registerHref = customer ? `/musteri/kayit${carried}` : "/isletmeler/kayit?source=login";
  return (
    <nav className={s.segmented} data-active={active === "register" ? "1" : "0"} aria-label={t("Giriş veya kayıt")}>
      <Link href={loginHref} aria-current={active === "login" ? "page" : undefined}>{t("Giriş yap")}</Link>
      <Link href={registerHref} aria-current={active === "register" ? "page" : undefined}>{customer ? t("Kayıt ol") : t("Ücretsiz başla")}</Link>
    </nav>
  );
}

function CardHead({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle: ReactNode }) {
  return (
    <header className={s.head}>
      <div className={s.headRow}>
        <span className={s.mark} aria-hidden="true"><Icon size={22} /></span>
        <div>
          <h2 className={s.title}>{title}</h2>
          <p className={s.subtitle}>{subtitle}</p>
        </div>
      </div>
    </header>
  );
}

const CUSTOMER_BENEFITS: Array<[LucideIcon, string]> = [
  [CalendarCheck2, tk("Randevularını tek yerden yönet")],
  [BellRing, tk("Hatırlatma bildirimleri")],
  [Heart, tk("Favori işletmeler")],
];

function CustomerExtras() {
  const t = useT();
  return (
    <>
      <ul className={s.benefits} aria-label={t("Hesabınla neler yapabilirsin")}>
        {CUSTOMER_BENEFITS.map(([Icon, text]) => <li key={text}><span aria-hidden="true"><Icon size={16} /></span>{t(text)}</li>)}
      </ul>
      <div className={s.note}>
        <Sparkles size={17} aria-hidden="true" />
        <span>{t("Bu cihazda misafir olarak aldığın randevular, giriş yaptıktan sonra otomatik olarak hesabına aktarılır.")}</span>
      </div>
    </>
  );
}

function TrustLine({ accountType }: { accountType: AccountType }) {
  const t = useT();
  return (
    <div className={s.trust}>
      <span><ShieldCheck size={14} aria-hidden="true" /> {t("Güvenli giriş")}</span>
      <span><BadgeCheck size={14} aria-hidden="true" /> <Link href="/kvkk">{t("KVKK uyumlu")}</Link></span>
      <span><Smartphone size={14} aria-hidden="true" /> {accountType === "customer" ? t("Her cihazdan erişim") : t("7/24 panel erişimi")}</span>
    </div>
  );
}

/* ─── 6 HANELİ KOD ─── */
function CodeInput({ value, onChange, labelledBy, invalid }: { value: string; onChange: (val: string) => void; labelledBy?: string; invalid?: boolean }) {
  const t = useT();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? "");

  const handleChange = useCallback((index: number, raw: string) => {
    const clean = raw.replace(/\D/g, "");
    const arr = digits.slice();
    if (clean.length > 1) {
      // Otomatik doldurma (one-time-code) veya yapıştırma: kutulara dağıt.
      clean.slice(0, 6 - index).split("").forEach((char, offset) => { arr[index + offset] = char; });
      onChange(arr.join("").slice(0, 6));
      inputRefs.current[Math.min(index + clean.length, 5)]?.focus();
      return;
    }
    arr[index] = clean;
    onChange(arr.join(""));
    if (clean && index < 5) inputRefs.current[index + 1]?.focus();
  }, [digits, onChange]);

  const handleKeyDown = useCallback((index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  }, [digits]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length > 0) {
      onChange(pasted);
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  }, [onChange]);

  return (
    <div className={s.otp} role="group" aria-labelledby={labelledBy} onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={t("Kodun {n}. hanesi", { n: i + 1 })}
          aria-invalid={invalid || undefined}
          value={d}
          data-filled={d ? "true" : undefined}
          onFocus={(e) => e.target.select()}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
        />
      ))}
    </div>
  );
}

/* ─── GERİ SAYIM ─── */
function useCountdown(initialSeconds: number) {
  const [seconds, setSeconds] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!active || seconds <= 0) return;
    const timer = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) { setActive(false); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [active, seconds]);

  const start = useCallback(() => {
    setSeconds(initialSeconds);
    setActive(true);
  }, [initialSeconds]);

  return { seconds, active, start };
}

function ResendRow({ countdown, onResend, label }: { countdown: { seconds: number; active: boolean }; onResend: () => void; label?: string }) {
  const t = useT();
  return (
    <div className={s.otpMeta}>
      <span>{label ?? t("Kod gelmedi mi?")}</span>
      {countdown.active
        ? <span aria-live="polite">{t("Yeniden gönder:")} <b>{t("{seconds} sn", { seconds: countdown.seconds })}</b></span>
        : <button type="button" className={s.ghostBtn} onClick={onResend}>{t("Kodu tekrar gönder")} <ArrowRight size={15} aria-hidden="true" /></button>}
    </div>
  );
}

/* ─────────────────── EKRAN İSKELETİ ─────────────────── */

const SCREEN_COPY: Record<AccountType, Record<ScreenMode, { eyebrow: string; title: string; text: string; bubble: string; mood: RoviMood }>> = {
  customer: {
    login: { eyebrow: tk("MÜŞTERİ HESABI"), title: tk("Tekrar <em>hoş geldin!</em>"), text: tk("Randevularını, hatırlatmalarını ve favori işletmelerini tek yerden yönet."), bubble: tk("Merhaba!"), mood: "wave" },
    register: { eyebrow: tk("ÜCRETSİZ ÜYELİK"), title: tk("Aramıza <em>hoş geldin!</em>"), text: tk("Ücretsiz hesabını aç; randevularını saniyeler içinde al, kolayca yönet."), bubble: tk("Hadi başlayalım!"), mood: "happy" },
    forgot: { eyebrow: tk("HESAP GÜVENLİĞİ"), title: tk("Şifreni <em>birlikte</em> yenileyelim."), text: tk("E-postana gelen 6 haneli kodla birkaç adımda hesabına geri dön."), bubble: tk("Hallederiz!"), mood: "thinking" },
  },
  business: {
    login: { eyebrow: tk("İŞLETME PANELİ"), title: tk("İşletmeni <em>tek ekrandan</em> yönet."), text: tk("Takvim, ekip, müşteri ve kasa — kaldığın yerden güvenle devam et."), bubble: tk("Hoş geldin!"), mood: "wave" },
    register: { eyebrow: tk("İLK AY ÜCRETSİZ"), title: tk("İşletmen için <em>online randevu</em>, dakikalar içinde."), text: tk("Mağaza sayfanı kur, hizmet ve ekibini ekle, ilk online randevunu bugün al."), bubble: tk("Kuralım mı?"), mood: "happy" },
    forgot: { eyebrow: tk("HESAP GÜVENLİĞİ"), title: tk("Şifreni <em>güvenle</em> yenile."), text: tk("E-postana gelen 6 haneli kodla birkaç adımda paneline geri dön."), bubble: tk("Hallederiz!"), mood: "thinking" },
  },
};

function VisualCards({ variant }: { variant: AccountType }) {
  const t = useT();
  if (variant === "business") {
    return (
      <>
        <div className={cx(s.float, s.float1)}><span><CalendarCheck2 size={19} /></span><p><small>{t("Bugün")}</small><b>{t("{count} randevu", { count: 18 })}</b></p><em>{t("CANLI")}</em></div>
        <div className={cx(s.float, s.float2)}><span><BarChart3 size={19} /></span><p><small>{t("Doluluk oranı")}</small><b>{t("%{value}", { value: 84 })}</b><span className={s.meter}><i /></span></p></div>
        <div className={cx(s.float, s.float3)}><span><UsersRound size={19} /></span><p><small>{t("Yeni online randevu")}</small><b>{t("14:30 · Saç kesimi")}</b></p><em>{t("YENİ")}</em></div>
      </>
    );
  }
  return (
    <>
      <div className={cx(s.float, s.float1)}><span><CalendarCheck2 size={19} /></span><p><small>{t("Yarın · 14:30")}</small><b>{t("Saç kesimi & fön")}</b></p><em>{t("ONAYLI")}</em></div>
      <div className={cx(s.float, s.float2)}><span><BellRing size={19} /></span><p><small>{t("Hatırlatma")}</small><b>{t("Randevuna 1 saat kaldı")}</b></p></div>
      <div className={cx(s.float, s.float3)}><span><Heart size={19} /></span><p><small>{t("Favori işletmen")}</small><b><Star size={13} fill="currentColor" aria-hidden="true" /> {t("4.9 · Yeni saatler açıldı")}</b></p></div>
    </>
  );
}

/** Giriş/kayıt/şifre sayfalarının ortak iskeleti: mobilde degrade başlık + kart, masaüstünde bölünmüş yerleşim. */
export function AuthScreen({ variant = "customer", mode, children }: { variant?: AccountType; mode: ScreenMode; children: ReactNode }) {
  const t = useT();
  const { user, status } = useAuth();
  const copy = SCREEN_COPY[variant][mode];
  const title = rich(t(copy.title));
  const customer = variant === "customer";
  const topLink = customer ? { href: "/kesfet", label: t("Keşfet"), icon: Compass } : { href: "/isletmeler", label: t("İşletmeler"), icon: Building2 };
  const TopIcon = topLink.icon;
  const brand = (
    <Link href="/" className={s.brand} aria-label={t("SeninRandevun ana sayfa")}>
      <Image src="/logo.png" alt="" width={34} height={34} />
      <b>Senin<span>Randevun</span></b>
    </Link>
  );

  return (
    <main className={cx(s.screen, !customer && s.business)}>
      {/* Görsel başlıklar ekran boyutuna göre gizlenir; sayfanın tek h1'i budur. */}
      <h1 className={s.srOnly}>{title}</h1>
      <aside className={s.visual} aria-label="SeninRandevun">
        <div className={s.grid} aria-hidden="true" />
        <div className={s.vTop}>
          {brand}
          <Link href={topLink.href} className={s.topLink}><TopIcon size={15} aria-hidden="true" />{topLink.label}</Link>
        </div>
        <div className={s.stage} aria-hidden="true">
          <div className={s.halo} />
          <div className={s.vRovi}><RoviMascot size={230} mood={copy.mood} alt="" /></div>
          <VisualCards variant={variant} />
        </div>
        <div className={s.vCopy}>
          <span className={s.eyebrow}>{t(copy.eyebrow)}</span>
          <p className={s.vTitle} aria-hidden="true">{title}</p>
          <p className={s.vText}>{t(copy.text)}</p>
          <div className={s.vStats}>
            {customer
              ? <><span><Gift size={15} aria-hidden="true" /> {t("Üyelik ücretsiz")}</span><span><Clock3 size={15} aria-hidden="true" /> {t("7/24 online randevu")}</span><span><BellRing size={15} aria-hidden="true" /> {t("Akıllı hatırlatmalar")}</span></>
              : <><span><Gift size={15} aria-hidden="true" /> {t("İlk ay ücretsiz")}</span><span><CreditCard size={15} aria-hidden="true" /> {t("Kredi kartı gerekmez")}</span><span><Zap size={15} aria-hidden="true" /> {t("Dakikalar içinde kurulum")}</span></>}
          </div>
        </div>
      </aside>

      <section className={s.formSide}>
        <header className={s.mHero}>
          <div className={s.grid} aria-hidden="true" />
          <div className={s.topbar}>
            {brand}
            <Link href={topLink.href} className={s.topLink}><TopIcon size={15} aria-hidden="true" />{topLink.label}</Link>
          </div>
          <div className={s.mHeroBody}>
            <div className={s.mHeroCopy}>
              <span className={s.eyebrow}>{t(copy.eyebrow)}</span>
              <p className={s.mHeroTitle} aria-hidden="true">{title}</p>
              <p className={s.mHeroText}>{t(copy.text)}</p>
            </div>
            <div className={cx(s.roviWrap, s.mHeroRovi)} aria-hidden="true">
              <span className={s.bubble}>{t(copy.bubble)}</span>
              <RoviMascot size={96} mood={copy.mood} alt="" />
            </div>
          </div>
        </header>

        <div className={s.formWrap}>
          <div className={s.formTop}>
            {customer
              ? <>{t("İşletme sahibi misin?")} <Link href="/isletmeler/giris">{t("İşletme girişi")}</Link></>
              : <>{t("Randevu almak mı istiyorsun?")} <Link href="/musteri/giris">{t("Müşteri girişi")}</Link></>}
          </div>
          {status === "authenticated" && user && mode !== "forgot" ? (
            <Link href={customer ? "/hesabim" : "/dashboard"} className={s.session}>
              <span aria-hidden="true"><Check size={16} /></span>
              <span><b>{t("Oturumun zaten açık")}</b><small>{customer ? t("Hesabıma devam et") : t("Panele devam et")}</small></span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          ) : null}
          {children}
        </div>

        <footer className={s.legal}>
          <Link href="/kullanim-kosullari">{t("Kullanım Koşulları")}</Link>
          <Link href="/kvkk">KVKK</Link>
          <Link href="/gizlilik">{t("Gizlilik")}</Link>
          <Link href="/yardim-merkezi">{t("Yardım")}</Link>
        </footer>
      </section>
    </main>
  );
}

/* ─────────────────── LOGIN ─────────────────── */
export function LoginForm({ accountType = "business" }: { accountType?: "business" | "customer" }) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [formError, setFormError] = useState<string | null>(null);
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const customer = accountType === "customer";

  const emailMsg = emailError(email, t);
  const passwordMsg = password ? undefined : t("Şifreni yaz.");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ email: true, password: true });
    if (emailMsg || passwordMsg) {
      focusById(emailMsg ? emailId : passwordId);
      return;
    }
    setFormError(null);
    setLoading(true);

    try {
      const { linked } = await loginWithEmailPassword(email, password);
      toast.success(linked ? t("Giriş başarılı! {provider} girişin de bu hesaba bağlandı.", { provider: PROVIDER_LABEL[linked] }) : t("Giriş başarılı! Yönlendiriliyorsunuz..."));
      const normalizedEmail = email.trim().toLowerCase();
      const fallback = normalizedEmail === PRIMARY_ADMIN_EMAIL ? "/admin" : accountType === "customer" ? "/hesabim" : "/dashboard";
      router.push(getSafeNextPath(fallback));
    } catch (error) {
      const message = mapAuthError(error, t);
      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={s.card}>
      <Segmented accountType={accountType} active="login" />
      <CardHead
        icon={customer ? UserRound : Building2}
        title={customer ? t("Hesabına giriş yap") : t("İşletme paneline giriş")}
        subtitle={customer ? (APPLE_WEB_SIGNIN_ENABLED ? t("Google, Apple veya e-postanla devam et.") : t("Google hesabın veya e-postanla devam et.")) : t("Bugünün akışına kaldığın yerden devam et.")}
      />

      <SocialSignIn accountType={accountType} mode="login" />

      <form className={s.form} onSubmit={onSubmit} noValidate>
        <FormAlert message={formError} />
        <TextField
          id={emailId}
          label={t("E-posta")}
          icon={Mail}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={t("ornek@email.com")}
          value={email}
          onChange={(e) => { setEmail(e.target.value); setFormError(null); }}
          onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
          error={touched.email ? emailMsg : undefined}
          valid={!emailMsg}
          required
        />
        <PasswordField
          id={passwordId}
          label={t("Şifre")}
          name="password"
          autoComplete="current-password"
          placeholder={t("Şifren")}
          value={password}
          onChange={(e) => { setPassword(e.target.value); setFormError(null); }}
          onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
          error={touched.password ? passwordMsg : undefined}
          labelAside={<Link className={s.labelLink} href={customer ? "/sifremi-unuttum?hesap=musteri" : "/sifremi-unuttum?hesap=isletme"}>{t("Şifremi unuttum")}</Link>}
          required
        />
        <SubmitButton loading={loading} loadingText={t("Giriş yapılıyor…")}>
          {customer ? t("Giriş yap") : t("Panele giriş yap")} <ArrowRight size={18} aria-hidden="true" />
        </SubmitButton>
      </form>

      {customer ? <CustomerExtras /> : (
        <div className={s.chips}>
          <span><CalendarCheck2 size={14} aria-hidden="true" /> {t("Canlı takvim")}</span>
          <span><UsersRound size={14} aria-hidden="true" /> {t("Ekip & müşteri")}</span>
          <span><BarChart3 size={14} aria-hidden="true" /> {t("Kasa & rapor")}</span>
        </div>
      )}

      <p className={s.switchLine}>
        {customer
          ? <>{t("Hesabın yok mu?")} <Link href="/musteri/kayit">{t("Ücretsiz kayıt ol")}</Link></>
          : <>{t("Henüz işletmeni eklemedin mi?")} <Link href="/isletmeler/kayit?source=login">{t("1 ay ücretsiz başla")}</Link></>}
      </p>
      <TrustLine accountType={accountType} />
    </div>
  );
}

function getSafeNextPath(fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const next = new URLSearchParams(window.location.search).get("next");
  // "/\\evil.com" gibi tarayıcının başka siteye çevirdiği yollar reddedilir.
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\u0000-\u001f]/.test(next)) return fallback;
  try {
    const resolved = new URL(next, window.location.origin);
    return resolved.origin === window.location.origin ? `${resolved.pathname}${resolved.search}${resolved.hash}` : fallback;
  } catch {
    return fallback;
  }
}

/* ─────────────────── REGISTER ─────────────────── */
export function RegisterForm({ accountType = "business", embedded = false }: { accountType?: "business" | "customer"; embedded?: boolean }) {
  const t = useT();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [step, setStep] = useState<"form" | "verify">("form");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [touched, setTouched] = useState({ name: false, email: false, password: false, agreed: false });
  const [formError, setFormError] = useState<string | null>(null);
  const router = useRouter();
  const countdown = useCountdown(60);
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const consentId = useId();
  const codeLabelId = useId();
  const customer = accountType === "customer";

  useEffect(() => {
    // Paneldeki kayıt anahtarı sadece yeni işletme çalışma alanlarını kontrol eder.
    // Müşteriler keşif ve randevu hesabını her zaman oluşturabilmelidir.
    if (accountType === "customer") return;
    getPlatformSettings()
      .then((settings) => setRegistrationOpen(settings.registrationOpen))
      .catch(() => setRegistrationOpen(true));
  }, [accountType]);

  const nameMsg = name.trim().length >= 2 ? undefined : t("Adını ve soyadını yaz.");
  const emailMsg = emailError(email, t);
  const passwordMsg = password.length >= 8 ? undefined : password ? t("Şifren en az 8 karakter olmalı.") : t("Bir şifre belirle.");
  const consentMsg = agreed ? undefined : t("Devam etmek için koşulları onaylamalısın.");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ name: true, email: true, password: true, agreed: true });
    const firstInvalid = nameMsg ? nameId : emailMsg ? emailId : passwordMsg ? passwordId : undefined;
    if (firstInvalid) {
      focusById(firstInvalid);
      return;
    }
    if (!agreed) {
      toast.error(t("Kullanım şartlarını kabul etmelisiniz."));
      focusById(consentId);
      return;
    }
    setFormError(null);
    setLoading(true);

    try {
      await registerWithEmailPassword(name, email, password);

      // Send verification code via email
      const fn = httpsCallable(getCloudFunctions(), "sendEmailVerificationCode");
      await fn({ email });
      countdown.start();

      toast.success(t("Kayıt başarılı! Doğrulama kodu e-postanıza gönderildi."));
      setStep("verify");
    } catch (error) {
      const message = mapAuthError(error, t);
      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function onVerify() {
    if (code.length !== 6) {
      toast.error(t("Lütfen 6 haneli kodu girin."));
      return;
    }
    setVerifying(true);
    setFormError(null);

    try {
      const fn = httpsCallable(getCloudFunctions(), "verifyEmailCode");
      await fn({ email, code });
      toast.success(t("E-posta doğrulandı! Yönlendiriliyorsunuz... ✅"));
      router.push(accountType === "customer" ? "/hesabim" : "/onboarding");
    } catch (error) {
      const raw = (error as { message?: string })?.message;
      const msg = raw ? t(raw) : t("Doğrulama başarısız.");
      setFormError(msg);
      toast.error(msg);
    } finally {
      setVerifying(false);
    }
  }

  async function resendCode() {
    try {
      const fn = httpsCallable(getCloudFunctions(), "sendEmailVerificationCode");
      await fn({ email });
      countdown.start();
      setCode("");
      toast.success(t("Yeni kod gönderildi!"));
    } catch (error) {
      const raw = (error as { message?: string })?.message;
      const msg = raw ? t(raw) : t("Kod gönderilemedi.");
      toast.error(msg);
    }
  }

  const shellClass = embedded ? cx(s.embedTokens, s.embedded) : s.card;

  if (!registrationOpen) {
    return (
      <div className={shellClass}>
        <CardHead icon={Clock3} title={t("Yeni kayıtlar geçici olarak kapalı")} subtitle={t("Platform şu anda yeni işletme kaydı almıyor. Lütfen daha sonra tekrar deneyin.")} />
        <p className={s.switchLine}>{t("Zaten hesabın var mı?")} <Link href="/isletmeler/giris">{t("Giriş yap")}</Link></p>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <div className={shellClass}>
        {!embedded && customer ? <div className={s.successRovi} aria-hidden="true"><RoviMascot size={76} mood="happy" alt="" /></div> : null}
        <CardHead
          icon={MailCheck}
          title={t("E-postanı doğrula")}
          subtitle={<>{t("Son bir adım kaldı. 6 haneli kodu şu adrese gönderdik:")}<br /><span className={s.emailPill}><Mail size={14} aria-hidden="true" />{email}</span></>}
        />
        <form className={s.form} onSubmit={(e) => { e.preventDefault(); void onVerify(); }} noValidate>
          <FormAlert message={formError} />
          <span id={codeLabelId} className={s.label}>{t("Doğrulama kodu")}</span>
          <CodeInput value={code} onChange={(val) => { setCode(val); setFormError(null); }} labelledBy={codeLabelId} invalid={Boolean(formError)} />
          <ResendRow countdown={countdown} onResend={resendCode} />
          <SubmitButton loading={verifying} loadingText={t("Doğrulanıyor…")} disabled={code.length !== 6}>
            {t("Kodu doğrula")} <ArrowRight size={18} aria-hidden="true" />
          </SubmitButton>
        </form>
        <div className={s.note}>
          <ShieldCheck size={17} aria-hidden="true" />
          <span>{t("Kod 5 dakika geçerlidir. Gelen kutunda göremezsen spam / gereksiz klasörünü kontrol et.")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      {!embedded && <Segmented accountType={accountType} active="register" />}
      {embedded
        ? <h2 className="sr-only">{t("Hesabını oluştur")}</h2>
        : <CardHead
            icon={customer ? Sparkles : Building2}
            title={customer ? t("Ücretsiz hesap oluştur") : t("Çalışma alanını oluştur")}
            subtitle={customer ? t("Bir dakikadan kısa sürer, üyelik tamamen ücretsiz.") : t("Lansmana özel: tüm özellikler ilk ay ücretsiz.")}
          />}

      {!embedded && <SocialSignIn accountType={accountType} mode="register" />}

      <form className={s.form} onSubmit={onSubmit} noValidate>
        <FormAlert message={formError} />
        <TextField
          id={nameId}
          label={t("Ad Soyad")}
          icon={UserRound}
          name="name"
          autoComplete="name"
          autoCapitalize="words"
          placeholder={t("Adın ve soyadın")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
          error={touched.name ? nameMsg : undefined}
          valid={!nameMsg}
          required
        />
        <TextField
          id={emailId}
          label={t("E-posta")}
          icon={Mail}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={t("ornek@email.com")}
          value={email}
          onChange={(e) => { setEmail(e.target.value); setFormError(null); }}
          onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
          error={touched.email ? emailMsg : undefined}
          valid={!emailMsg}
          hint={customer && !(touched.email && emailMsg) ? t("Randevu onayları ve hatırlatmalar bu adrese gelir.") : undefined}
          required
        />
        <PasswordField
          id={passwordId}
          label={t("Şifre")}
          name="new-password"
          autoComplete="new-password"
          placeholder={t("En az 8 karakter")}
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
          error={touched.password ? passwordMsg : undefined}
          hint={<PasswordStrength password={password} />}
          required
        />

        <label className={s.consent} data-invalid={touched.agreed && consentMsg ? "true" : undefined}>
          <input
            id={consentId}
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            aria-invalid={touched.agreed && consentMsg ? true : undefined}
            aria-describedby={touched.agreed && consentMsg ? `${consentId}-error` : undefined}
          />
          <span className={s.box} aria-hidden="true"><Check size={14} /></span>
          <span>
            {rich(t("<terms>Kullanım Koşulları</terms>'nı, <kvkk>KVKK Aydınlatma Metni</kvkk>'ni ve <privacy>Gizlilik Politikası</privacy>'nı okudum, kabul ediyorum."), {
              terms: (chunk) => <Link href="/kullanim-kosullari" target="_blank" rel="noopener">{chunk}</Link>,
              kvkk: (chunk) => <Link href="/kvkk" target="_blank" rel="noopener">{chunk}</Link>,
              privacy: (chunk) => <Link href="/gizlilik" target="_blank" rel="noopener">{chunk}</Link>,
            })}
          </span>
        </label>
        {touched.agreed && consentMsg ? <p id={`${consentId}-error`} className={s.error}><AlertCircle size={14} aria-hidden="true" />{consentMsg}</p> : null}

        <SubmitButton loading={loading} loadingText={t("Hesap oluşturuluyor…")}>
          {customer ? t("Ücretsiz hesap oluştur") : t("İlk ay ücretsiz başla")} <ArrowRight size={18} aria-hidden="true" />
        </SubmitButton>
      </form>

      {!embedded && customer ? <CustomerExtras /> : null}
      {!embedded && !customer ? (
        <div className={s.chips}>
          <span><Gift size={14} aria-hidden="true" /> {t("İlk ay ücretsiz")}</span>
          <span><Zap size={14} aria-hidden="true" /> {t("2 dk kurulum")}</span>
          <span><CreditCard size={14} aria-hidden="true" /> {t("Kredi kartı yok")}</span>
        </div>
      ) : null}

      <p className={s.switchLine}>
        {t("Zaten hesabın var mı?")}{" "}
        <Link href={customer ? "/musteri/giris" : "/isletmeler/giris"}>{t("Giriş yap")}</Link>
      </p>
      {!embedded && <TrustLine accountType={accountType} />}
    </div>
  );
}

/* ─────────────────── ŞİFREMİ UNUTTUM (6 haneli kod) ─────────────────── */
export function ForgotPasswordForm() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [staffInvite, setStaffInvite] = useState(false);
  const [loginHref, setLoginHref] = useState("/giris");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"email" | "code" | "done">("email");
  const [codeStage, setCodeStage] = useState<"code" | "password">("code");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const countdown = useCountdown(60);
  const emailId = useId();
  const passwordId = useId();
  const codeLabelId = useId();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invited = params.get("source") === "staff-invite";
    const invitedEmail = params.get("email") ?? "";
    const audience = params.get("hesap");
    queueMicrotask(() => {
      setStaffInvite(invited);
      if (invitedEmail) setEmail(invitedEmail);
      setLoginHref(invited || audience === "isletme" ? "/isletmeler/giris" : audience === "musteri" ? "/musteri/giris" : "/giris");
    });
  }, []);

  const emailMsg = emailError(email, t);
  const passwordMsg = newPassword.length >= 8 ? undefined : t("Şifren en az 8 karakter olmalı.");

  async function onSendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailTouched(true);
    if (emailMsg) {
      focusById(emailId);
      return;
    }
    setFormError(null);
    setLoading(true);

    try {
      const fn = httpsCallable(getCloudFunctions(), "sendPasswordResetCode");
      await fn({ email });
      countdown.start();
      toast.success(t("Şifre sıfırlama kodu gönderildi!"));
      setStep("code");
      setCodeStage("code");
    } catch (error) {
      const raw = (error as { message?: string })?.message;
      const msg = raw ? t(raw) : t("Kod gönderilemedi.");
      setFormError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function onReset() {
    if (code.length !== 6) {
      toast.error(t("Lütfen 6 haneli kodu girin."));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t("Şifre en az 8 karakter olmalıdır."));
      return;
    }
    setResetting(true);
    setFormError(null);

    try {
      const fn = httpsCallable(getCloudFunctions(), "resetPasswordWithCode");
      await fn({ email, code, newPassword });
      toast.success(t("Şifreniz başarıyla güncellendi! 🎉"));
      setStep("done");
    } catch (error) {
      const raw = (error as { message?: string })?.message;
      const msg = raw ? t(raw) : t("Şifre sıfırlama başarısız.");
      setFormError(msg);
      toast.error(msg);
    } finally {
      setResetting(false);
    }
  }

  async function resendCode() {
    try {
      const fn = httpsCallable(getCloudFunctions(), "sendPasswordResetCode");
      await fn({ email });
      countdown.start();
      setCode("");
      setCodeStage("code");
      setFormError(null);
      toast.success(t("Yeni kod gönderildi!"));
    } catch (error) {
      const raw = (error as { message?: string })?.message;
      const msg = raw ? t(raw) : t("Kod gönderilemedi.");
      toast.error(msg);
    }
  }

  const stepIndex = step === "email" ? 0 : step === "done" ? 3 : codeStage === "code" ? 1 : 2;
  const stepLabels: Array<[string, LucideIcon]> = [[t("E-posta"), Mail], [t("Kod"), KeyRound], [staffInvite ? t("Şifre belirle") : t("Yeni şifre"), LockKeyhole]];

  return (
    <div className={s.card}>
      <ol className={s.steps} aria-label={t("Şifre yenileme adımları")}>
        {stepLabels.map(([label, Icon], index) => {
          const state = index < stepIndex ? "done" : index === stepIndex ? "active" : "todo";
          return (
            <li key={label} data-state={state} aria-current={state === "active" ? "step" : undefined}>
              <span>{state === "done" ? <Check size={13} aria-hidden="true" /> : <Icon size={13} aria-hidden="true" />}{label}</span>
            </li>
          );
        })}
      </ol>

      {step === "done" ? (
        <div>
          <div className={s.successRovi} aria-hidden="true"><RoviMascot size={92} mood="happy" alt="" /></div>
          <CardHead
            icon={CheckCircle2}
            title={staffInvite ? t("Çalışan hesabın hazır!") : t("Şifren güncellendi!")}
            subtitle={staffInvite ? t("Yeni şifrenle kişisel çalışan paneline giriş yapabilirsin.") : t("Yeni şifrenle hemen giriş yapabilirsin.")}
          />
          <div className={s.form}>
            <Link href={loginHref} className={s.submit}>{t("Giriş yap")} <ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
        </div>
      ) : step === "code" ? (
        codeStage === "code" ? (
          <div>
            <CardHead
              icon={KeyRound}
              title={t("Kodu gir")}
              subtitle={<>{t("6 haneli kodu şu adrese gönderdik:")}<br /><span className={s.emailPill}><Mail size={14} aria-hidden="true" />{email}</span></>}
            />
            <form className={s.form} onSubmit={(e) => { e.preventDefault(); if (code.length === 6) setCodeStage("password"); }} noValidate>
              <span id={codeLabelId} className={s.label}>{t("Doğrulama kodu")}</span>
              <CodeInput value={code} onChange={setCode} labelledBy={codeLabelId} invalid={Boolean(formError)} />
              <ResendRow countdown={countdown} onResend={resendCode} />
              <SubmitButton loading={false} loadingText="" disabled={code.length !== 6}>
                {t("Devam et")} <ArrowRight size={18} aria-hidden="true" />
              </SubmitButton>
              <button type="button" className={s.ghostBtn} onClick={() => { setStep("email"); setFormError(null); }}>
                <ArrowLeft size={15} aria-hidden="true" /> {t("E-postayı değiştir")}
              </button>
            </form>
          </div>
        ) : (
          <div>
            <CardHead
              icon={LockKeyhole}
              title={staffInvite ? t("Şifreni belirle") : t("Yeni şifreni belirle")}
              subtitle={t("Kolay tahmin edilmeyen, en az 8 karakterlik bir şifre seç.")}
            />
            <form
              className={s.form}
              onSubmit={(e) => {
                e.preventDefault();
                setPasswordTouched(true);
                if (passwordMsg) { focusById(passwordId); return; }
                void onReset();
              }}
              noValidate
            >
              <FormAlert message={formError} />
              <input type="email" name="email" autoComplete="username" value={email} readOnly hidden />
              <PasswordField
                id={passwordId}
                label={staffInvite ? t("Şifre") : t("Yeni şifre")}
                name="new-password"
                autoComplete="new-password"
                placeholder={t("En az 8 karakter")}
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onBlur={() => setPasswordTouched(true)}
                error={passwordTouched ? passwordMsg : undefined}
                hint={<PasswordStrength password={newPassword} />}
                required
              />
              <SubmitButton loading={resetting} loadingText={t("Şifre güncelleniyor…")} disabled={code.length !== 6}>
                {staffInvite ? t("Şifremi kaydet") : t("Şifremi güncelle")} <ArrowRight size={18} aria-hidden="true" />
              </SubmitButton>
              <button type="button" className={s.ghostBtn} onClick={() => { setCodeStage("code"); setFormError(null); }}>
                <ArrowLeft size={15} aria-hidden="true" /> {t("Kodu düzenle")}
              </button>
            </form>
          </div>
        )
      ) : (
        <div>
          <CardHead
            icon={staffInvite ? UsersRound : KeyRound}
            title={staffInvite ? t("Çalışan hesabını etkinleştir") : t("Şifreni mi unuttun?")}
            subtitle={staffInvite
              ? t("İşletmen seni ekibine ekledi. E-postana 6 haneli bir kod gönderelim, ardından kendi şifreni belirle.")
              : t("Sorun değil. Kayıtlı e-posta adresine 6 haneli bir sıfırlama kodu gönderelim.")}
          />
          <form className={s.form} onSubmit={onSendCode} noValidate>
            <FormAlert message={formError} />
            <TextField
              id={emailId}
              label={t("E-posta")}
              icon={Mail}
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={t("ornek@email.com")}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFormError(null); }}
              onBlur={() => setEmailTouched(true)}
              error={emailTouched ? emailMsg : undefined}
              valid={!emailMsg}
              required
            />
            <SubmitButton loading={loading} loadingText={t("Gönderiliyor…")}>
              {t("Kodu gönder")} <ArrowRight size={18} aria-hidden="true" />
            </SubmitButton>
            <Link href={loginHref} className={s.ghostBtn}><ArrowLeft size={15} aria-hidden="true" /> {t("Giriş sayfasına dön")}</Link>
          </form>
        </div>
      )}

      <div className={s.note}>
        <ShieldCheck size={17} aria-hidden="true" />
        <span>{t("Kod 5 dakika geçerlidir. Gelen kutunda göremezsen spam / gereksiz klasörünü kontrol et.")}</span>
      </div>
    </div>
  );
}

/* ─────────────────── Google / Apple ile giriş ─────────────────── */
function GoogleMark() {
  return <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>;
}

function AppleMark() {
  return <svg width="18" height="20" viewBox="0 0 17 20" aria-hidden="true"><path fill="currentColor" d="M14.1 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9C3.6 4.8 2 5.8 1.1 7.3c-1.8 3.2-.5 7.9 1.3 10.5.9 1.3 1.9 2.7 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.4.8 2.3-1.3 3.1-2.6c1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.3zM11.6 3c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z"/></svg>;
}

function SocialSignIn({ accountType, mode }: { accountType: AccountType; mode: "login" | "register" }) {
  const t = useT();
  const router = useRouter();
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const customer = accountType === "customer";

  async function start(provider: SocialProvider) {
    setError(null);
    setBusy(provider);
    try {
      const result = await signInWithSocial(provider);
      if (result.redirected) return;
      toast.success(result.linked ? t("Giriş başarılı! {provider} girişin de bu hesaba bağlandı.", { provider: PROVIDER_LABEL[result.linked] }) : t("Giriş başarılı! Yönlendiriliyorsunuz..."));
      // Yeni işletme hesabı kurulum sihirbazına, diğerleri panele / hesaba gider.
      const fallback = result.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL ? "/admin" : customer ? "/hesabim" : result.isNewUser || mode === "register" ? "/onboarding" : "/dashboard";
      router.push(getSafeNextPath(fallback));
    } catch (err) {
      const code = (err as FirebaseError | undefined)?.code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      if (err instanceof AccountExistsError) {
        const other = err.provider === "apple" ? t("Google veya e-posta/şifre") : t("e-posta/şifre veya Apple");
        const message = t("{email} zaten kayıtlı. Bu hesaba daha önce girdiğin yöntemle ({other}) giriş yap; {provider} girişin otomatik olarak aynı hesaba bağlanacak.", { email: err.email, other, provider: PROVIDER_LABEL[err.provider] });
        setError(message);
        toast.info(message, { duration: 9000 });
        return;
      }
      const message = mapAuthError(err, t);
      setError(message);
      toast.error(message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={s.social}>
      <FormAlert message={error} />
      {APPLE_WEB_SIGNIN_ENABLED && <button type="button" className={cx(s.socialBtn, s.socialApple)} onClick={() => void start("apple")} disabled={busy !== null} aria-busy={busy === "apple"}>
        {busy === "apple" ? <span className={cx(s.spinner, s.spinnerDark)} aria-hidden="true" /> : <AppleMark />}
        <span>{mode === "register" ? t("Apple ile kaydol") : t("Apple ile devam et")}</span>
      </button>}
      <button type="button" className={cx(s.socialBtn, s.socialGoogle)} onClick={() => void start("google")} disabled={busy !== null} aria-busy={busy === "google"}>
        {busy === "google" ? <span className={cx(s.spinner, s.spinnerDark)} aria-hidden="true" /> : <GoogleMark />}
        <span>{mode === "register" ? t("Google ile kaydol") : t("Google ile devam et")}</span>
      </button>
      <div className={s.socialDivider} role="separator"><span>{t("veya e-posta ile")}</span></div>
    </div>
  );
}
