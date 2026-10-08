"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
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

const PRIMARY_ADMIN_EMAIL = "cihatwin@gmail.com";

type AccountType = "business" | "customer";

// Apple web girişi Firebase'de Services ID (com.cihat.seninrandevun.web) ile yapılandırıldı.
// Acil durumda NEXT_PUBLIC_APPLE_SIGNIN_ENABLED=0 ile kapatılabilir.
const APPLE_WEB_SIGNIN_ENABLED = process.env.NEXT_PUBLIC_APPLE_SIGNIN_ENABLED !== "0";
type ScreenMode = "login" | "register" | "forgot";

function getCloudFunctions() {
  return getFunctions(getFirebaseApp(), "europe-west1");
}

function mapAuthError(error: unknown): string {
  const code = (error as FirebaseError | undefined)?.code;

  const mapper: Record<string, string> = {
    "auth/invalid-credential": "E-posta veya şifre hatalı.",
    "auth/configuration-not-found": "Firebase Authentication'da Email/Password provider aktif değil. Firebase Console > Authentication > Sign-in method bölümünden Email/Password'ü açın.",
    "auth/user-not-found": "Bu e-posta ile kayıtlı kullanıcı bulunamadı.",
    "auth/wrong-password": "Şifre hatalı.",
    "auth/email-already-in-use": "Bu e-posta zaten kullanılıyor.",
    "auth/weak-password": "Şifre en az 8 karakter olmalı.",
    "auth/invalid-email": "E-posta formatı geçersiz.",
    "auth/network-request-failed": "Ağ hatası oluştu. İnternet bağlantınızı kontrol edin.",
    "auth/too-many-requests": "Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.",
    "auth/account-exists-with-different-credential": "Bu e-posta başka bir giriş yöntemiyle kayıtlı. Önce o yöntemle (örn. e-posta ve şifre) giriş yapın.",
    "auth/unauthorized-domain": "Bu alan adı Firebase'de yetkili değil. Firebase Console > Authentication > Settings > Authorized domains listesine ekleyin.",
    "auth/operation-not-allowed": "Bu giriş yöntemi şu anda kapalı.",
    "auth/invalid-oauth-client-id": "Apple ile giriş web için henüz yapılandırılmamış.",
    "auth/invalid-credential-or-provider-id": "Giriş sağlayıcısı yapılandırması hatalı.",
    "auth/user-disabled": "Bu hesap devre dışı bırakılmış.",
  };

  if (code && mapper[code]) return mapper[code];

  const message = (error as Error | undefined)?.message;
  if (message?.includes("Firebase istemci konfigurasyonu eksik")) {
    return "Firebase web konfigurasyonu eksik. .env.local dosyasını kontrol edin.";
  }

  return message ?? "Beklenmeyen bir hata oluştu.";
}

/* ─────────────────── UI yardımcıları (yalnız görsel) ─────────────────── */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function emailError(value: string): string | undefined {
  if (!value.trim()) return "E-posta adresini yaz.";
  if (!EMAIL_PATTERN.test(value.trim())) return "Geçerli bir e-posta adresi yaz (ör. ad@ornek.com).";
  return undefined;
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
          aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"}
          aria-pressed={visible}
          aria-controls={id}
        >
          {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
          <span aria-hidden="true">{visible ? "Gizle" : "Göster"}</span>
        </button>
      </div>
      {capsOn ? <p id={capsId} className={s.caps} role="status"><AlertCircle size={14} aria-hidden="true" />Caps Lock açık</p> : null}
      {error ? <p id={errorId} className={s.error}><AlertCircle size={14} aria-hidden="true" />{error}</p> : null}
      {hint ? <div id={hintId} className={s.hint}>{hint}</div> : null}
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  // Mevcut kayıt formundaki güç hesabı aynen korunur.
  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 8 ? 2 : /(?=.*[A-Z])(?=.*[0-9])/.test(password) ? 4 : 3;
  const strengthLabel = ["", "Çok zayıf", "Zayıf", "Orta", "Güçlü"];
  const tip = strength === 0
    ? "En az 8 karakter kullan."
    : strength < 3
      ? `${Math.max(0, 8 - password.length)} karakter daha ekle.`
      : strength === 3
        ? "Büyük harf ve rakam ekleyerek güçlendir."
        : "Harika, şifren güçlü.";
  return (
    <div className={s.strength} data-level={strength}>
      <div className={s.bars} aria-hidden="true"><i /><i /><i /><i /></div>
      <div className={s.strengthText} aria-live="polite">
        <span>Şifre gücü: <b>{strength ? strengthLabel[strength] : "—"}</b></span>
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
  const carried = useCarriedQuery();
  const customer = accountType === "customer";
  const loginHref = customer ? `/musteri/giris${carried}` : "/isletmeler/giris";
  const registerHref = customer ? `/musteri/kayit${carried}` : "/isletmeler/kayit?source=login";
  return (
    <nav className={s.segmented} data-active={active === "register" ? "1" : "0"} aria-label="Giriş veya kayıt">
      <Link href={loginHref} aria-current={active === "login" ? "page" : undefined}>Giriş yap</Link>
      <Link href={registerHref} aria-current={active === "register" ? "page" : undefined}>{customer ? "Kayıt ol" : "Ücretsiz başla"}</Link>
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
  [CalendarCheck2, "Randevularını tek yerden yönet"],
  [BellRing, "Hatırlatma bildirimleri"],
  [Heart, "Favori işletmeler"],
];

function CustomerExtras() {
  return (
    <>
      <ul className={s.benefits} aria-label="Hesabınla neler yapabilirsin">
        {CUSTOMER_BENEFITS.map(([Icon, text]) => <li key={text}><span aria-hidden="true"><Icon size={16} /></span>{text}</li>)}
      </ul>
      <div className={s.note}>
        <Sparkles size={17} aria-hidden="true" />
        <span>Bu cihazda misafir olarak aldığın randevular, giriş yaptıktan sonra otomatik olarak hesabına aktarılır.</span>
      </div>
    </>
  );
}

function TrustLine({ accountType }: { accountType: AccountType }) {
  return (
    <div className={s.trust}>
      <span><ShieldCheck size={14} aria-hidden="true" /> Güvenli giriş</span>
      <span><BadgeCheck size={14} aria-hidden="true" /> <Link href="/kvkk">KVKK uyumlu</Link></span>
      <span><Smartphone size={14} aria-hidden="true" /> {accountType === "customer" ? "Her cihazdan erişim" : "7/24 panel erişimi"}</span>
    </div>
  );
}

/* ─── 6 HANELİ KOD ─── */
function CodeInput({ value, onChange, labelledBy, invalid }: { value: string; onChange: (val: string) => void; labelledBy?: string; invalid?: boolean }) {
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
          aria-label={`Kodun ${i + 1}. hanesi`}
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

function ResendRow({ countdown, onResend, label = "Kod gelmedi mi?" }: { countdown: { seconds: number; active: boolean }; onResend: () => void; label?: string }) {
  return (
    <div className={s.otpMeta}>
      <span>{label}</span>
      {countdown.active
        ? <span aria-live="polite">Yeniden gönder: <b>{countdown.seconds} sn</b></span>
        : <button type="button" className={s.ghostBtn} onClick={onResend}>Kodu tekrar gönder <ArrowRight size={15} aria-hidden="true" /></button>}
    </div>
  );
}

/* ─────────────────── EKRAN İSKELETİ ─────────────────── */

const SCREEN_COPY: Record<AccountType, Record<ScreenMode, { eyebrow: string; title: ReactNode; text: string; bubble: string; mood: RoviMood }>> = {
  customer: {
    login: { eyebrow: "MÜŞTERİ HESABI", title: <>Tekrar <em>hoş geldin!</em></>, text: "Randevularını, hatırlatmalarını ve favori işletmelerini tek yerden yönet.", bubble: "Merhaba!", mood: "wave" },
    register: { eyebrow: "ÜCRETSİZ ÜYELİK", title: <>Aramıza <em>hoş geldin!</em></>, text: "Ücretsiz hesabını aç; randevularını saniyeler içinde al, kolayca yönet.", bubble: "Hadi başlayalım!", mood: "happy" },
    forgot: { eyebrow: "HESAP GÜVENLİĞİ", title: <>Şifreni <em>birlikte</em> yenileyelim.</>, text: "E-postana gelen 6 haneli kodla birkaç adımda hesabına geri dön.", bubble: "Hallederiz!", mood: "thinking" },
  },
  business: {
    login: { eyebrow: "İŞLETME PANELİ", title: <>İşletmeni <em>tek ekrandan</em> yönet.</>, text: "Takvim, ekip, müşteri ve kasa — kaldığın yerden güvenle devam et.", bubble: "Hoş geldin!", mood: "wave" },
    register: { eyebrow: "İLK AY ÜCRETSİZ", title: <>İşletmen için <em>online randevu</em>, dakikalar içinde.</>, text: "Mağaza sayfanı kur, hizmet ve ekibini ekle, ilk online randevunu bugün al.", bubble: "Kuralım mı?", mood: "happy" },
    forgot: { eyebrow: "HESAP GÜVENLİĞİ", title: <>Şifreni <em>güvenle</em> yenile.</>, text: "E-postana gelen 6 haneli kodla birkaç adımda paneline geri dön.", bubble: "Hallederiz!", mood: "thinking" },
  },
};

function VisualCards({ variant }: { variant: AccountType }) {
  if (variant === "business") {
    return (
      <>
        <div className={cx(s.float, s.float1)}><span><CalendarCheck2 size={19} /></span><p><small>Bugün</small><b>18 randevu</b></p><em>CANLI</em></div>
        <div className={cx(s.float, s.float2)}><span><BarChart3 size={19} /></span><p><small>Doluluk oranı</small><b>%84</b><span className={s.meter}><i /></span></p></div>
        <div className={cx(s.float, s.float3)}><span><UsersRound size={19} /></span><p><small>Yeni online randevu</small><b>14:30 · Saç kesimi</b></p><em>YENİ</em></div>
      </>
    );
  }
  return (
    <>
      <div className={cx(s.float, s.float1)}><span><CalendarCheck2 size={19} /></span><p><small>Yarın · 14:30</small><b>Saç kesimi & fön</b></p><em>ONAYLI</em></div>
      <div className={cx(s.float, s.float2)}><span><BellRing size={19} /></span><p><small>Hatırlatma</small><b>Randevuna 1 saat kaldı</b></p></div>
      <div className={cx(s.float, s.float3)}><span><Heart size={19} /></span><p><small>Favori işletmen</small><b><Star size={13} fill="currentColor" aria-hidden="true" /> 4.9 · Yeni saatler açıldı</b></p></div>
    </>
  );
}

/** Giriş/kayıt/şifre sayfalarının ortak iskeleti: mobilde degrade başlık + kart, masaüstünde bölünmüş yerleşim. */
export function AuthScreen({ variant = "customer", mode, children }: { variant?: AccountType; mode: ScreenMode; children: ReactNode }) {
  const { user, status } = useAuth();
  const copy = SCREEN_COPY[variant][mode];
  const customer = variant === "customer";
  const topLink = customer ? { href: "/kesfet", label: "Keşfet", icon: Compass } : { href: "/isletmeler", label: "İşletmeler", icon: Building2 };
  const TopIcon = topLink.icon;
  const brand = (
    <Link href="/" className={s.brand} aria-label="SeninRandevun ana sayfa">
      <Image src="/logo.png" alt="" width={34} height={34} />
      <b>Senin<span>Randevun</span></b>
    </Link>
  );

  return (
    <main className={cx(s.screen, !customer && s.business)}>
      {/* Görsel başlıklar ekran boyutuna göre gizlenir; sayfanın tek h1'i budur. */}
      <h1 className={s.srOnly}>{copy.title}</h1>
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
          <span className={s.eyebrow}>{copy.eyebrow}</span>
          <p className={s.vTitle} aria-hidden="true">{copy.title}</p>
          <p className={s.vText}>{copy.text}</p>
          <div className={s.vStats}>
            {customer
              ? <><span><Gift size={15} aria-hidden="true" /> Üyelik ücretsiz</span><span><Clock3 size={15} aria-hidden="true" /> 7/24 online randevu</span><span><BellRing size={15} aria-hidden="true" /> Akıllı hatırlatmalar</span></>
              : <><span><Gift size={15} aria-hidden="true" /> İlk ay ücretsiz</span><span><CreditCard size={15} aria-hidden="true" /> Kredi kartı gerekmez</span><span><Zap size={15} aria-hidden="true" /> Dakikalar içinde kurulum</span></>}
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
              <span className={s.eyebrow}>{copy.eyebrow}</span>
              <p className={s.mHeroTitle} aria-hidden="true">{copy.title}</p>
              <p className={s.mHeroText}>{copy.text}</p>
            </div>
            <div className={cx(s.roviWrap, s.mHeroRovi)} aria-hidden="true">
              <span className={s.bubble}>{copy.bubble}</span>
              <RoviMascot size={96} mood={copy.mood} alt="" />
            </div>
          </div>
        </header>

        <div className={s.formWrap}>
          <div className={s.formTop}>
            {customer
              ? <>İşletme sahibi misin? <Link href="/isletmeler/giris">İşletme girişi</Link></>
              : <>Randevu almak mı istiyorsun? <Link href="/musteri/giris">Müşteri girişi</Link></>}
          </div>
          {status === "authenticated" && user && mode !== "forgot" ? (
            <Link href={customer ? "/hesabim" : "/dashboard"} className={s.session}>
              <span aria-hidden="true"><Check size={16} /></span>
              <span><b>Oturumun zaten açık</b><small>{customer ? "Hesabıma" : "Panele"} devam et</small></span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          ) : null}
          {children}
        </div>

        <footer className={s.legal}>
          <Link href="/kullanim-kosullari">Kullanım Koşulları</Link>
          <Link href="/kvkk">KVKK</Link>
          <Link href="/gizlilik">Gizlilik</Link>
          <Link href="/yardim-merkezi">Yardım</Link>
        </footer>
      </section>
    </main>
  );
}

/* ─────────────────── LOGIN ─────────────────── */
export function LoginForm({ accountType = "business" }: { accountType?: "business" | "customer" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [formError, setFormError] = useState<string | null>(null);
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const customer = accountType === "customer";

  const emailMsg = emailError(email);
  const passwordMsg = password ? undefined : "Şifreni yaz.";

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
      toast.success(linked ? `Giriş başarılı! ${PROVIDER_LABEL[linked]} girişin de bu hesaba bağlandı.` : "Giriş başarılı! Yönlendiriliyorsunuz...");
      const normalizedEmail = email.trim().toLowerCase();
      const fallback = normalizedEmail === PRIMARY_ADMIN_EMAIL ? "/admin" : accountType === "customer" ? "/hesabim" : "/dashboard";
      router.push(getSafeNextPath(fallback));
    } catch (error) {
      const message = mapAuthError(error);
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
        title={customer ? "Hesabına giriş yap" : "İşletme paneline giriş"}
        subtitle={customer ? (APPLE_WEB_SIGNIN_ENABLED ? "Google, Apple veya e-postanla devam et." : "Google hesabın veya e-postanla devam et.") : "Bugünün akışına kaldığın yerden devam et."}
      />

      <SocialSignIn accountType={accountType} mode="login" />

      <form className={s.form} onSubmit={onSubmit} noValidate>
        <FormAlert message={formError} />
        <TextField
          id={emailId}
          label="E-posta"
          icon={Mail}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="ornek@email.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setFormError(null); }}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          error={touched.email ? emailMsg : undefined}
          valid={!emailMsg}
          required
        />
        <PasswordField
          id={passwordId}
          label="Şifre"
          name="password"
          autoComplete="current-password"
          placeholder="Şifren"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setFormError(null); }}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          error={touched.password ? passwordMsg : undefined}
          labelAside={<Link className={s.labelLink} href={customer ? "/sifremi-unuttum?hesap=musteri" : "/sifremi-unuttum?hesap=isletme"}>Şifremi unuttum</Link>}
          required
        />
        <SubmitButton loading={loading} loadingText="Giriş yapılıyor…">
          {customer ? "Giriş yap" : "Panele giriş yap"} <ArrowRight size={18} aria-hidden="true" />
        </SubmitButton>
      </form>

      {customer ? <CustomerExtras /> : (
        <div className={s.chips}>
          <span><CalendarCheck2 size={14} aria-hidden="true" /> Canlı takvim</span>
          <span><UsersRound size={14} aria-hidden="true" /> Ekip & müşteri</span>
          <span><BarChart3 size={14} aria-hidden="true" /> Kasa & rapor</span>
        </div>
      )}

      <p className={s.switchLine}>
        {customer
          ? <>Hesabın yok mu? <Link href="/musteri/kayit">Ücretsiz kayıt ol</Link></>
          : <>Henüz işletmeni eklemedin mi? <Link href="/isletmeler/kayit?source=login">1 ay ücretsiz başla</Link></>}
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

  const nameMsg = name.trim().length >= 2 ? undefined : "Adını ve soyadını yaz.";
  const emailMsg = emailError(email);
  const passwordMsg = password.length >= 8 ? undefined : password ? "Şifren en az 8 karakter olmalı." : "Bir şifre belirle.";
  const consentMsg = agreed ? undefined : "Devam etmek için koşulları onaylamalısın.";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ name: true, email: true, password: true, agreed: true });
    const firstInvalid = nameMsg ? nameId : emailMsg ? emailId : passwordMsg ? passwordId : undefined;
    if (firstInvalid) {
      focusById(firstInvalid);
      return;
    }
    if (!agreed) {
      toast.error("Kullanım şartlarını kabul etmelisiniz.");
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

      toast.success("Kayıt başarılı! Doğrulama kodu e-postanıza gönderildi.");
      setStep("verify");
    } catch (error) {
      const message = mapAuthError(error);
      setFormError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function onVerify() {
    if (code.length !== 6) {
      toast.error("Lütfen 6 haneli kodu girin.");
      return;
    }
    setVerifying(true);
    setFormError(null);

    try {
      const fn = httpsCallable(getCloudFunctions(), "verifyEmailCode");
      await fn({ email, code });
      toast.success("E-posta doğrulandı! Yönlendiriliyorsunuz... ✅");
      router.push(accountType === "customer" ? "/hesabim" : "/onboarding");
    } catch (error) {
      const msg = (error as { message?: string })?.message || "Doğrulama başarısız.";
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
      toast.success("Yeni kod gönderildi!");
    } catch (error) {
      const msg = (error as { message?: string })?.message || "Kod gönderilemedi.";
      toast.error(msg);
    }
  }

  const shellClass = embedded ? cx(s.embedTokens, s.embedded) : s.card;

  if (!registrationOpen) {
    return (
      <div className={shellClass}>
        <CardHead icon={Clock3} title="Yeni kayıtlar geçici olarak kapalı" subtitle="Platform şu anda yeni işletme kaydı almıyor. Lütfen daha sonra tekrar deneyin." />
        <p className={s.switchLine}>Zaten hesabın var mı? <Link href="/isletmeler/giris">Giriş yap</Link></p>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <div className={shellClass}>
        {!embedded && customer ? <div className={s.successRovi} aria-hidden="true"><RoviMascot size={76} mood="happy" alt="" /></div> : null}
        <CardHead
          icon={MailCheck}
          title="E-postanı doğrula"
          subtitle={<>Son bir adım kaldı. 6 haneli kodu şu adrese gönderdik:<br /><span className={s.emailPill}><Mail size={14} aria-hidden="true" />{email}</span></>}
        />
        <form className={s.form} onSubmit={(e) => { e.preventDefault(); void onVerify(); }} noValidate>
          <FormAlert message={formError} />
          <span id={codeLabelId} className={s.label}>Doğrulama kodu</span>
          <CodeInput value={code} onChange={(val) => { setCode(val); setFormError(null); }} labelledBy={codeLabelId} invalid={Boolean(formError)} />
          <ResendRow countdown={countdown} onResend={resendCode} />
          <SubmitButton loading={verifying} loadingText="Doğrulanıyor…" disabled={code.length !== 6}>
            Kodu doğrula <ArrowRight size={18} aria-hidden="true" />
          </SubmitButton>
        </form>
        <div className={s.note}>
          <ShieldCheck size={17} aria-hidden="true" />
          <span>Kod 5 dakika geçerlidir. Gelen kutunda göremezsen spam / gereksiz klasörünü kontrol et.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      {!embedded && <Segmented accountType={accountType} active="register" />}
      {embedded
        ? <h2 className="sr-only">Hesabını oluştur</h2>
        : <CardHead
            icon={customer ? Sparkles : Building2}
            title={customer ? "Ücretsiz hesap oluştur" : "Çalışma alanını oluştur"}
            subtitle={customer ? "Bir dakikadan kısa sürer, üyelik tamamen ücretsiz." : "Lansmana özel: tüm özellikler ilk ay ücretsiz."}
          />}

      {!embedded && <SocialSignIn accountType={accountType} mode="register" />}

      <form className={s.form} onSubmit={onSubmit} noValidate>
        <FormAlert message={formError} />
        <TextField
          id={nameId}
          label="Ad Soyad"
          icon={UserRound}
          name="name"
          autoComplete="name"
          autoCapitalize="words"
          placeholder="Adın ve soyadın"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, name: true }))}
          error={touched.name ? nameMsg : undefined}
          valid={!nameMsg}
          required
        />
        <TextField
          id={emailId}
          label="E-posta"
          icon={Mail}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="ornek@email.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setFormError(null); }}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          error={touched.email ? emailMsg : undefined}
          valid={!emailMsg}
          hint={customer && !(touched.email && emailMsg) ? "Randevu onayları ve hatırlatmalar bu adrese gelir." : undefined}
          required
        />
        <PasswordField
          id={passwordId}
          label="Şifre"
          name="new-password"
          autoComplete="new-password"
          placeholder="En az 8 karakter"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
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
            <Link href="/kullanim-kosullari" target="_blank" rel="noopener">Kullanım Koşulları</Link>&apos;nı,{" "}
            <Link href="/kvkk" target="_blank" rel="noopener">KVKK Aydınlatma Metni</Link>&apos;ni ve{" "}
            <Link href="/gizlilik" target="_blank" rel="noopener">Gizlilik Politikası</Link>&apos;nı okudum, kabul ediyorum.
          </span>
        </label>
        {touched.agreed && consentMsg ? <p id={`${consentId}-error`} className={s.error}><AlertCircle size={14} aria-hidden="true" />{consentMsg}</p> : null}

        <SubmitButton loading={loading} loadingText="Hesap oluşturuluyor…">
          {customer ? "Ücretsiz hesap oluştur" : "İlk ay ücretsiz başla"} <ArrowRight size={18} aria-hidden="true" />
        </SubmitButton>
      </form>

      {!embedded && customer ? <CustomerExtras /> : null}
      {!embedded && !customer ? (
        <div className={s.chips}>
          <span><Gift size={14} aria-hidden="true" /> İlk ay ücretsiz</span>
          <span><Zap size={14} aria-hidden="true" /> 2 dk kurulum</span>
          <span><CreditCard size={14} aria-hidden="true" /> Kredi kartı yok</span>
        </div>
      ) : null}

      <p className={s.switchLine}>
        Zaten hesabın var mı?{" "}
        <Link href={customer ? "/musteri/giris" : "/isletmeler/giris"}>Giriş yap</Link>
      </p>
      {!embedded && <TrustLine accountType={accountType} />}
    </div>
  );
}

/* ─────────────────── ŞİFREMİ UNUTTUM (6 haneli kod) ─────────────────── */
export function ForgotPasswordForm() {
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

  const emailMsg = emailError(email);
  const passwordMsg = newPassword.length >= 8 ? undefined : "Şifren en az 8 karakter olmalı.";

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
      toast.success("Şifre sıfırlama kodu gönderildi!");
      setStep("code");
      setCodeStage("code");
    } catch (error) {
      const msg = (error as { message?: string })?.message || "Kod gönderilemedi.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function onReset() {
    if (code.length !== 6) {
      toast.error("Lütfen 6 haneli kodu girin.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Şifre en az 8 karakter olmalıdır.");
      return;
    }
    setResetting(true);
    setFormError(null);

    try {
      const fn = httpsCallable(getCloudFunctions(), "resetPasswordWithCode");
      await fn({ email, code, newPassword });
      toast.success("Şifreniz başarıyla güncellendi! 🎉");
      setStep("done");
    } catch (error) {
      const msg = (error as { message?: string })?.message || "Şifre sıfırlama başarısız.";
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
      toast.success("Yeni kod gönderildi!");
    } catch (error) {
      const msg = (error as { message?: string })?.message || "Kod gönderilemedi.";
      toast.error(msg);
    }
  }

  const stepIndex = step === "email" ? 0 : step === "done" ? 3 : codeStage === "code" ? 1 : 2;
  const stepLabels: Array<[string, LucideIcon]> = [["E-posta", Mail], ["Kod", KeyRound], [staffInvite ? "Şifre belirle" : "Yeni şifre", LockKeyhole]];

  return (
    <div className={s.card}>
      <ol className={s.steps} aria-label="Şifre yenileme adımları">
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
            title={staffInvite ? "Çalışan hesabın hazır!" : "Şifren güncellendi!"}
            subtitle={staffInvite ? "Yeni şifrenle kişisel çalışan paneline giriş yapabilirsin." : "Yeni şifrenle hemen giriş yapabilirsin."}
          />
          <div className={s.form}>
            <Link href={loginHref} className={s.submit}>Giriş yap <ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
        </div>
      ) : step === "code" ? (
        codeStage === "code" ? (
          <div>
            <CardHead
              icon={KeyRound}
              title="Kodu gir"
              subtitle={<>6 haneli kodu şu adrese gönderdik:<br /><span className={s.emailPill}><Mail size={14} aria-hidden="true" />{email}</span></>}
            />
            <form className={s.form} onSubmit={(e) => { e.preventDefault(); if (code.length === 6) setCodeStage("password"); }} noValidate>
              <span id={codeLabelId} className={s.label}>Doğrulama kodu</span>
              <CodeInput value={code} onChange={setCode} labelledBy={codeLabelId} invalid={Boolean(formError)} />
              <ResendRow countdown={countdown} onResend={resendCode} />
              <SubmitButton loading={false} loadingText="" disabled={code.length !== 6}>
                Devam et <ArrowRight size={18} aria-hidden="true" />
              </SubmitButton>
              <button type="button" className={s.ghostBtn} onClick={() => { setStep("email"); setFormError(null); }}>
                <ArrowLeft size={15} aria-hidden="true" /> E-postayı değiştir
              </button>
            </form>
          </div>
        ) : (
          <div>
            <CardHead
              icon={LockKeyhole}
              title={staffInvite ? "Şifreni belirle" : "Yeni şifreni belirle"}
              subtitle="Kolay tahmin edilmeyen, en az 8 karakterlik bir şifre seç."
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
                label={staffInvite ? "Şifre" : "Yeni şifre"}
                name="new-password"
                autoComplete="new-password"
                placeholder="En az 8 karakter"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onBlur={() => setPasswordTouched(true)}
                error={passwordTouched ? passwordMsg : undefined}
                hint={<PasswordStrength password={newPassword} />}
                required
              />
              <SubmitButton loading={resetting} loadingText="Şifre güncelleniyor…" disabled={code.length !== 6}>
                {staffInvite ? "Şifremi kaydet" : "Şifremi güncelle"} <ArrowRight size={18} aria-hidden="true" />
              </SubmitButton>
              <button type="button" className={s.ghostBtn} onClick={() => { setCodeStage("code"); setFormError(null); }}>
                <ArrowLeft size={15} aria-hidden="true" /> Kodu düzenle
              </button>
            </form>
          </div>
        )
      ) : (
        <div>
          <CardHead
            icon={staffInvite ? UsersRound : KeyRound}
            title={staffInvite ? "Çalışan hesabını etkinleştir" : "Şifreni mi unuttun?"}
            subtitle={staffInvite
              ? "İşletmen seni ekibine ekledi. E-postana 6 haneli bir kod gönderelim, ardından kendi şifreni belirle."
              : "Sorun değil. Kayıtlı e-posta adresine 6 haneli bir sıfırlama kodu gönderelim."}
          />
          <form className={s.form} onSubmit={onSendCode} noValidate>
            <FormAlert message={formError} />
            <TextField
              id={emailId}
              label="E-posta"
              icon={Mail}
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="ornek@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFormError(null); }}
              onBlur={() => setEmailTouched(true)}
              error={emailTouched ? emailMsg : undefined}
              valid={!emailMsg}
              required
            />
            <SubmitButton loading={loading} loadingText="Gönderiliyor…">
              Kodu gönder <ArrowRight size={18} aria-hidden="true" />
            </SubmitButton>
            <Link href={loginHref} className={s.ghostBtn}><ArrowLeft size={15} aria-hidden="true" /> Giriş sayfasına dön</Link>
          </form>
        </div>
      )}

      <div className={s.note}>
        <ShieldCheck size={17} aria-hidden="true" />
        <span>Kod 5 dakika geçerlidir. Gelen kutunda göremezsen spam / gereksiz klasörünü kontrol et.</span>
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
      toast.success(result.linked ? `Giriş başarılı! ${PROVIDER_LABEL[result.linked]} girişin de bu hesaba bağlandı.` : "Giriş başarılı! Yönlendiriliyorsunuz...");
      // Yeni işletme hesabı kurulum sihirbazına, diğerleri panele / hesaba gider.
      const fallback = result.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL ? "/admin" : customer ? "/hesabim" : result.isNewUser || mode === "register" ? "/onboarding" : "/dashboard";
      router.push(getSafeNextPath(fallback));
    } catch (err) {
      const code = (err as FirebaseError | undefined)?.code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      if (err instanceof AccountExistsError) {
        const other = err.provider === "apple" ? "Google veya e-posta/şifre" : "e-posta/şifre veya Apple";
        const message = `${err.email} zaten kayıtlı. Bu hesaba daha önce girdiğin yöntemle (${other}) giriş yap; ${PROVIDER_LABEL[err.provider]} girişin otomatik olarak aynı hesaba bağlanacak.`;
        setError(message);
        toast.info(message, { duration: 9000 });
        return;
      }
      const message = mapAuthError(err);
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
        <span>Apple ile {mode === "register" ? "kaydol" : "devam et"}</span>
      </button>}
      <button type="button" className={cx(s.socialBtn, s.socialGoogle)} onClick={() => void start("google")} disabled={busy !== null} aria-busy={busy === "google"}>
        {busy === "google" ? <span className={cx(s.spinner, s.spinnerDark)} aria-hidden="true" /> : <GoogleMark />}
        <span>Google ile {mode === "register" ? "kaydol" : "devam et"}</span>
      </button>
      <div className={s.socialDivider} role="separator"><span>veya e-posta ile</span></div>
    </div>
  );
}
