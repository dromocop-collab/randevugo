"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useRef, useEffect, useCallback } from "react";
import type { FirebaseError } from "firebase/app";
import { toast } from "sonner";
import { httpsCallable } from "firebase/functions";
import { getFunctions } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";
import {
  loginWithEmailPassword,
  registerWithEmailPassword,
} from "@/features/auth/auth-service";
import { getPlatformSettings } from "@/features/platform/platform-settings-repository";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PRIMARY_ADMIN_EMAIL = "cihatwin@gmail.com";

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
  };

  if (code && mapper[code]) return mapper[code];

  const message = (error as Error | undefined)?.message;
  if (message?.includes("Firebase istemci konfigurasyonu eksik")) {
    return "Firebase web konfigurasyonu eksik. .env.local dosyasını kontrol edin.";
  }

  return message ?? "Beklenmeyen bir hata oluştu.";
}

/* ─── 6-DIGIT CODE INPUT ─── */
function CodeInput({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? "");

  const handleChange = useCallback((index: number, char: string) => {
    if (!/^\d?$/.test(char)) return;
    const arr = digits.slice();
    arr[index] = char;
    onChange(arr.join(""));
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [digits, onChange]);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
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
    <div className="flex justify-center gap-2.5" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="h-14 w-12 rounded-xl border-2 border-[var(--border)] bg-[var(--surface-2)] text-center text-2xl font-black text-[var(--accent)] transition-all focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:scale-105"
        />
      ))}
    </div>
  );
}

/* ─── COUNTDOWN TIMER ─── */
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

/* ─────────────────── LOGIN ─────────────────── */
export function LoginForm({ accountType = "business" }: { accountType?: "business" | "customer" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      await loginWithEmailPassword(email, password);
      toast.success("Giriş başarılı! Yönlendiriliyorsunuz...");
      const normalizedEmail = email.trim().toLowerCase();
      const fallback = normalizedEmail === PRIMARY_ADMIN_EMAIL ? "/admin" : accountType === "customer" ? "/hesabim" : "/dashboard";
      router.push(getSafeNextPath(fallback));
    } catch (error) {
      toast.error(mapAuthError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Form Card */}
      <div className="auth-form-card rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-xl shadow-[var(--shadow-hard)] sm:p-8">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-extrabold tracking-tight text-[var(--text-1)]">Tekrar hoş geldiniz.</h2>
          <p className="mt-1 text-sm text-[var(--text-3)]">{accountType === "customer" ? "Randevularınıza ve favori mağazalarınıza ulaşın." : "İşletme çalışma alanınıza güvenle devam edin."}</p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <Input
            label="E-posta Adresi"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="ornek@email.com"
          />
          <div className="relative">
            <Input
              label="Şifre"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[38px] text-xs text-[var(--text-3)] hover:text-[var(--text-1)] transition"
            >
              {showPassword ? "Gizle" : "Göster"}
            </button>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-[var(--text-3)]">
              <input type="checkbox" checked readOnly className="rounded border-[var(--border)]" />
              Oturumu açık tut
            </label>
            <Link href="/sifremi-unuttum" className="font-medium text-[var(--accent)] hover:underline">
              Şifremi unuttum
            </Link>
          </div>

          <Button className="w-full" disabled={loading} type="submit">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Giriş yapılıyor...
              </span>
            ) : (
              "Güvenli Giriş Yap →"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-[var(--text-3)]">
            Hesabın yok mu?{" "}
            <Link href={accountType === "customer" ? "/musteri/kayit" : "/isletmeler/kayit"} className="font-semibold text-[var(--accent)] hover:underline">
              Ücretsiz başla →
            </Link>
          </p>
        </div>
      </div>

      {/* Trust badges */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-[var(--text-3)]">
        <span className="flex items-center gap-1">🔒 SSL Korumalı</span>
        <span>•</span>
        <span className="flex items-center gap-1">🛡️ KVKK Uyumlu</span>
        <span>•</span>
        <span className="flex items-center gap-1">⚡ Firebase Güvencesi</span>
      </div>
    </div>
  );
}

function getSafeNextPath(fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

/* ─────────────────── REGISTER ─────────────────── */
export function RegisterForm({ accountType = "business" }: { accountType?: "business" | "customer" }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [step, setStep] = useState<"form" | "verify">("form");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const router = useRouter();
  const countdown = useCountdown(60);

  useEffect(() => {
    // Paneldeki kayıt anahtarı sadece yeni işletme çalışma alanlarını kontrol eder.
    // Müşteriler keşif ve randevu hesabını her zaman oluşturabilmelidir.
    if (accountType === "customer") return;
    getPlatformSettings()
      .then((settings) => setRegistrationOpen(settings.registrationOpen))
      .catch(() => setRegistrationOpen(true));
  }, [accountType]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!agreed) {
      toast.error("Kullanım şartlarını kabul etmelisiniz.");
      return;
    }
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
      toast.error(mapAuthError(error));
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

    try {
      const fn = httpsCallable(getCloudFunctions(), "verifyEmailCode");
      await fn({ email, code });
      toast.success("E-posta doğrulandı! Yönlendiriliyorsunuz... ✅");
      router.push(accountType === "customer" ? "/hesabim" : "/onboarding");
    } catch (error) {
      const msg = (error as { message?: string })?.message || "Doğrulama başarısız.";
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

  // Password strength
  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 8 ? 2 : /(?=.*[A-Z])(?=.*[0-9])/.test(password) ? 4 : 3;
  const strengthLabel = ["", "Çok zayıf", "Zayıf", "Orta", "Güçlü"];
  const strengthColor = ["", "bg-rose-500", "bg-amber-500", "bg-yellow-500", "bg-emerald-500"];

  if (!registrationOpen) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-8 text-center shadow-xl shadow-[var(--shadow-hard)]">
        <span className="text-4xl">🚧</span>
        <h2 className="mt-3 text-lg font-bold text-[var(--text-1)]">Yeni kayıtlar geçici olarak kapalı</h2>
        <p className="mt-2 text-sm text-[var(--text-3)]">Platform şu anda yeni kayıt almıyor. Lütfen daha sonra tekrar deneyin.</p>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-xl shadow-[var(--shadow-hard)] sm:p-8">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-3)] shadow-lg shadow-sky-500/25">
              <span className="text-3xl">📧</span>
            </div>
            <h2 className="text-xl font-bold text-[var(--text-1)]">E-posta Doğrulama</h2>
            <p className="mt-2 text-sm text-[var(--text-3)]">
              <span className="font-medium text-[var(--text-2)]">{email}</span> adresine
              <br />6 haneli doğrulama kodu gönderdik
            </p>
          </div>

          {/* Code input */}
          <div className="mb-6">
            <CodeInput value={code} onChange={setCode} />
          </div>

          {/* Timer */}
          <div className="mb-5 text-center">
            {countdown.active ? (
              <p className="text-xs text-[var(--text-3)]">
                Yeni kod gönderebilmek için{" "}
                <span className="font-bold text-[var(--accent)]">{countdown.seconds}s</span>{" "}
                bekleyin
              </p>
            ) : (
              <button
                onClick={resendCode}
                className="text-sm font-semibold text-[var(--accent)] hover:underline"
              >
                Kodu tekrar gönder →
              </button>
            )}
          </div>

          {/* Verify button */}
          <Button
            className="w-full"
            disabled={verifying || code.length !== 6}
            onClick={onVerify}
          >
            {verifying ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Doğrulanıyor...
              </span>
            ) : (
              "✅ Kodu Doğrula"
            )}
          </Button>

          {/* Security note */}
          <div className="mt-5 rounded-xl bg-[var(--surface-2)] p-3 text-center">
            <p className="text-[11px] text-[var(--text-3)]">
              🔒 Kod 5 dakika geçerlidir. Spam klasörünüzü kontrol etmeyi unutmayın.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Form Card */}
      <div className="auth-form-card rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-xl shadow-[var(--shadow-hard)] sm:p-8">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-extrabold tracking-tight text-[var(--text-1)]">{accountType === "customer" ? "Ücretsiz müşteri hesabınızı açın." : "Ücretsiz çalışma alanınızı açın."}</h2>
          <p className="mt-1 text-sm text-[var(--text-3)]">{accountType === "customer" ? "Randevularınız tek yerde · Üyelik tamamen ücretsiz" : "Yeni işletmelere özel · Tüm özellikler ilk 12 ay ücretsiz"}</p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <Input
            label="Ad Soyad"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Adınız Soyadınız"
          />
          <Input
            label="E-posta Adresi"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="ornek@email.com"
          />
          <div>
            <div className="relative">
              <Input
                label="Şifre"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                placeholder="En az 8 karakter"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[38px] text-xs text-[var(--text-3)] hover:text-[var(--text-1)] transition"
              >
                {showPassword ? "Gizle" : "Göster"}
              </button>
            </div>
            {/* Strength bar */}
            {password.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition ${
                        level <= strength ? strengthColor[strength] : "bg-[var(--surface-3)]"
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-[var(--text-3)]">
                  Şifre gücü: <span className="font-medium">{strengthLabel[strength]}</span>
                </p>
              </div>
            )}
          </div>

          <label className="flex items-start gap-2.5 text-xs text-[var(--text-3)]">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 rounded border-[var(--border)]"
            />
            <span>
              <Link href="/kullanim-kosullari" className="text-[var(--accent)] hover:underline">Kullanım Şartları</Link>
              {" "}ve{" "}
              <Link href="/gizlilik" className="text-[var(--accent)] hover:underline">Gizlilik Politikası</Link>
              &apos;nı okudum ve kabul ediyorum.
            </span>
          </label>

          <Button className="w-full" disabled={loading || !agreed} type="submit">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Hesap oluşturuluyor...
              </span>
            ) : (
              accountType === "customer" ? "Ücretsiz Hesap Oluştur →" : "14 Gün Ücretsiz Başla →"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-[var(--text-3)]">
            Zaten hesabın var mı?{" "}
            <Link href={accountType === "customer" ? "/musteri/giris" : "/isletmeler/giris"} className="font-semibold text-[var(--accent)] hover:underline">
              Giriş Yap →
            </Link>
          </p>
        </div>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-2 gap-3">
        {(accountType === "customer" ? [
          { icon: "✓", text: "Tamamen ücretsiz" }, { icon: "⌕", text: "Kolay keşif" }, { icon: "♡", text: "Favori mağazalar" }, { icon: "◷", text: "Randevu geçmişi" },
        ] : [
          { icon: "🎁", text: "İlk yıl ücretsiz" }, { icon: "⚡", text: "2 dk kurulum" }, { icon: "🚫", text: "Kredi kartı yok" }, { icon: "📱", text: "Tüm cihazlar" },
        ]).map((b) => (
          <div key={b.text} className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2.5 text-xs text-[var(--text-2)]">
            <span>{b.icon}</span>
            {b.text}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────── FORGOT PASSWORD (6-digit code) ─────────────────── */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"email" | "code" | "done">("email");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const countdown = useCountdown(60);

  async function onSendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const fn = httpsCallable(getCloudFunctions(), "sendPasswordResetCode");
      await fn({ email });
      countdown.start();
      toast.success("Şifre sıfırlama kodu gönderildi!");
      setStep("code");
    } catch (error) {
      const msg = (error as { message?: string })?.message || "Kod gönderilemedi.";
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

    try {
      const fn = httpsCallable(getCloudFunctions(), "resetPasswordWithCode");
      await fn({ email, code, newPassword });
      toast.success("Şifreniz başarıyla güncellendi! 🎉");
      setStep("done");
    } catch (error) {
      const msg = (error as { message?: string })?.message || "Şifre sıfırlama başarısız.";
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
      toast.success("Yeni kod gönderildi!");
    } catch (error) {
      const msg = (error as { message?: string })?.message || "Kod gönderilemedi.";
      toast.error(msg);
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-xl shadow-[var(--shadow-hard)] sm:p-8">
      {step === "done" ? (
        /* ── SUCCESS ── */
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25">
            <span className="text-3xl">✅</span>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-1)]">Şifre güncellendi!</h2>
          <p className="mt-2 text-sm text-[var(--text-3)]">
            Yeni şifrenizle giriş yapabilirsiniz.
          </p>
          <Link
            href="/giris"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
          >
            🔐 Giriş Yap
          </Link>
        </div>
      ) : step === "code" ? (
        /* ── CODE + NEW PASSWORD ── */
        <div>
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-3)] shadow-lg shadow-sky-500/25">
              <span className="text-3xl">🔑</span>
            </div>
            <h2 className="text-xl font-bold text-[var(--text-1)]">Şifre Sıfırlama</h2>
            <p className="mt-2 text-sm text-[var(--text-3)]">
              <span className="font-medium text-[var(--text-2)]">{email}</span> adresine
              <br />6 haneli sıfırlama kodu gönderdik
            </p>
          </div>

          {/* Code */}
          <div className="mb-5">
            <p className="mb-2 text-xs font-medium text-[var(--text-2)]">Doğrulama Kodu</p>
            <CodeInput value={code} onChange={setCode} />
          </div>

          {/* Timer */}
          <div className="mb-5 text-center">
            {countdown.active ? (
              <p className="text-xs text-[var(--text-3)]">
                Yeni kod:{" "}
                <span className="font-bold text-[var(--accent)]">{countdown.seconds}s</span>
              </p>
            ) : (
              <button
                onClick={resendCode}
                className="text-sm font-semibold text-[var(--accent)] hover:underline"
              >
                Kodu tekrar gönder →
              </button>
            )}
          </div>

          {/* New Password */}
          <div className="mb-5 relative">
            <Input
              label="Yeni Şifre"
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              placeholder="En az 8 karakter"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[38px] text-xs text-[var(--text-3)] hover:text-[var(--text-1)] transition"
            >
              {showPassword ? "Gizle" : "Göster"}
            </button>
          </div>

          <Button
            className="w-full"
            disabled={resetting || code.length !== 6 || newPassword.length < 8}
            onClick={onReset}
          >
            {resetting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Şifre güncelleniyor...
              </span>
            ) : (
              "🔐 Şifremi Güncelle"
            )}
          </Button>

          <div className="mt-4 rounded-xl bg-[var(--surface-2)] p-3 text-center">
            <p className="text-[11px] text-[var(--text-3)]">
              🔒 Kod 5 dakika geçerlidir. Spam klasörünüzü kontrol edin.
            </p>
          </div>
        </div>
      ) : (
        /* ── EMAIL INPUT ── */
        <div>
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-3)] shadow-lg shadow-sky-500/25">
              <span className="text-3xl">🔑</span>
            </div>
            <h2 className="text-xl font-bold text-[var(--text-1)]">Şifrenizi sıfırlayın</h2>
            <p className="mt-1 text-sm text-[var(--text-3)]">
              E-posta adresinize 6 haneli sıfırlama kodu göndereceğiz
            </p>
          </div>

          <form className="space-y-4" onSubmit={onSendCode}>
            <Input
              label="E-posta Adresi"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="ornek@email.com"
            />
            <Button className="w-full" disabled={loading} type="submit">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Gönderiliyor...
                </span>
              ) : (
                "📨 Sıfırlama Kodu Gönder"
              )}
            </Button>
            <p className="text-center text-sm text-[var(--text-3)]">
              <Link href="/giris" className="text-[var(--accent)] hover:underline">
                ← Giriş sayfasına dön
              </Link>
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
