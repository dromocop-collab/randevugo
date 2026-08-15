"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { FirebaseError } from "firebase/app";
import { toast } from "sonner";
import {
  forgotPassword,
  loginWithEmailPassword,
  registerWithEmailPassword,
} from "@/features/auth/auth-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PRIMARY_ADMIN_EMAIL = "cihatwin@gmail.com";

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

/* ─────────────────── LOGIN ─────────────────── */
export function LoginForm() {
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
      router.push(normalizedEmail === PRIMARY_ADMIN_EMAIL ? "/admin" : "/dashboard");
    } catch (error) {
      toast.error(mapAuthError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Form Card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-xl shadow-[var(--shadow-hard)] sm:p-8">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-[var(--text-1)]">Tekrar hoş geldiniz! 👋</h2>
          <p className="mt-1 text-sm text-[var(--text-3)]">Randevularınızı yönetmek için giriş yapın</p>
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
              <input type="checkbox" className="rounded border-[var(--border)]" />
              Beni hatırla
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
              "🔐 Giriş Yap"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-[var(--text-3)]">
            Hesabın yok mu?{" "}
            <Link href="/kayit" className="font-semibold text-[var(--accent)] hover:underline">
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

/* ─────────────────── REGISTER ─────────────────── */
export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!agreed) {
      toast.error("Kullanım şartlarını kabul etmelisiniz.");
      return;
    }
    setLoading(true);

    try {
      await registerWithEmailPassword(name, email, password);
      toast.success("Kayıt başarılı! Yönlendiriliyorsunuz...");
      router.push("/onboarding");
    } catch (error) {
      toast.error(mapAuthError(error));
    } finally {
      setLoading(false);
    }
  }

  // Password strength
  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 8 ? 2 : /(?=.*[A-Z])(?=.*[0-9])/.test(password) ? 4 : 3;
  const strengthLabel = ["", "Çok zayıf", "Zayıf", "Orta", "Güçlü"];
  const strengthColor = ["", "bg-rose-500", "bg-amber-500", "bg-yellow-500", "bg-emerald-500"];

  return (
    <div className="space-y-6">
      {/* Form Card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-xl shadow-[var(--shadow-hard)] sm:p-8">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-[var(--text-1)]">İşletmenizi dijitale taşıyın 🚀</h2>
          <p className="mt-1 text-sm text-[var(--text-3)]">2 dakikada kayıt olun, hemen kullanmaya başlayın</p>
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
              <Link href="/" className="text-[var(--accent)] hover:underline">Kullanım Şartları</Link>
              {" "}ve{" "}
              <Link href="/" className="text-[var(--accent)] hover:underline">Gizlilik Politikası</Link>
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
              "🚀 Ücretsiz Başla"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-[var(--text-3)]">
            Zaten hesabın var mı?{" "}
            <Link href="/giris" className="font-semibold text-[var(--accent)] hover:underline">
              Giriş Yap →
            </Link>
          </p>
        </div>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: "💳", text: "14 gün ücretsiz" },
          { icon: "⚡", text: "2 dk kurulum" },
          { icon: "🚫", text: "Kredi kartı yok" },
          { icon: "📱", text: "Tüm cihazlar" },
        ].map((b) => (
          <div key={b.text} className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2.5 text-xs text-[var(--text-2)]">
            <span>{b.icon}</span>
            {b.text}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────── FORGOT PASSWORD ─────────────────── */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      await forgotPassword(email);
      setSent(true);
      toast.success("Şifre sıfırlama bağlantısı gönderildi.");
    } catch (error) {
      toast.error(mapAuthError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-xl shadow-[var(--shadow-hard)] sm:p-8">
      <div className="mb-6 text-center">
        <span className="text-4xl">🔑</span>
        <h2 className="mt-3 text-xl font-bold text-[var(--text-1)]">Şifrenizi sıfırlayın</h2>
        <p className="mt-1 text-sm text-[var(--text-3)]">Kayıtlı e-posta adresinize sıfırlama bağlantısı göndereceğiz</p>
      </div>

      {sent ? (
        <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-5 text-center">
          <span className="text-3xl">📧</span>
          <p className="mt-2 text-sm font-medium text-emerald-700">
            E-posta gönderildi! Gelen kutunuzu kontrol edin.
          </p>
          <p className="mt-1 text-xs text-[var(--text-3)]">
            Spam klasörünü de kontrol etmeyi unutmayın.
          </p>
          <Link href="/giris" className="mt-4 inline-block text-sm font-medium text-[var(--accent)] hover:underline">
            ← Giriş sayfasına dön
          </Link>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit}>
          <Input
            label="E-posta Adresi"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="ornek@email.com"
          />
          <Button className="w-full" disabled={loading} type="submit">
            {loading ? "Gönderiliyor..." : "📨 Sıfırlama Bağlantısı Gönder"}
          </Button>
          <p className="text-center text-sm text-[var(--text-3)]">
            <Link href="/giris" className="text-[var(--accent)] hover:underline">
              ← Giriş sayfasına dön
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
