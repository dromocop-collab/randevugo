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
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const PRIMARY_ADMIN_EMAIL = "cihatwin@gmail.com";

function mapAuthError(error: unknown): string {
  const code = (error as FirebaseError | undefined)?.code;

  const mapper: Record<string, string> = {
    "auth/invalid-credential": "E-posta veya sifre hatali.",
    "auth/configuration-not-found": "Firebase Authentication'da Email/Password provider aktif degil. Firebase Console > Authentication > Sign-in method bolumunden Email/Password'u acin.",
    "auth/user-not-found": "Bu e-posta ile kayitli kullanici bulunamadi.",
    "auth/wrong-password": "Sifre hatali.",
    "auth/email-already-in-use": "Bu e-posta zaten kullaniliyor.",
    "auth/weak-password": "Sifre en az 8 karakter olmali.",
    "auth/invalid-email": "E-posta formati gecersiz.",
    "auth/network-request-failed": "Ag hatasi olustu. Internet baglantinizi kontrol edin.",
    "auth/too-many-requests": "Cok fazla deneme yapildi. Lutfen biraz sonra tekrar deneyin.",
  };

  if (code && mapper[code]) return mapper[code];

  const message = (error as Error | undefined)?.message;
  if (message?.includes("Firebase istemci konfigurasyonu eksik")) {
    return "Firebase web konfigurasyonu eksik. .env.local dosyasini kontrol edin.";
  }

  return message ?? "Beklenmeyen bir hata olustu.";
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      await loginWithEmailPassword(email, password);
      toast.success("Giris basarili");
      const normalizedEmail = email.trim().toLowerCase();
      router.push(normalizedEmail === PRIMARY_ADMIN_EMAIL ? "/admin" : "/dashboard");
    } catch (error) {
      toast.error(mapAuthError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Tekrar hos geldiniz" description="Randevularinizi yonetmek icin giris yapin.">
      <form className="space-y-4" onSubmit={onSubmit}>
        <Input label="E-posta" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Sifre" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Button className="w-full" disabled={loading} type="submit">
          {loading ? "Giris yapiliyor..." : "Giris Yap"}
        </Button>
        <p className="text-right text-sm">
          <Link href="/sifremi-unuttum" className="text-[var(--accent)] hover:underline">
            Sifremi unuttum
          </Link>
        </p>
        <p className="text-center text-sm text-[var(--text-3)]">
          Hesabin yok mu? <Link href="/kayit" className="text-sky-600">Ucretsiz basla</Link>
        </p>
      </form>
    </Card>
  );
}

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      await registerWithEmailPassword(name, email, password);
      toast.success("Kayit basarili");
      router.push("/onboarding");
    } catch (error) {
      toast.error(mapAuthError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Isletmenizi dijitale tasiyin" description="Dakikalar icinde premium randevu deneyimi sunun.">
      <form className="space-y-4" onSubmit={onSubmit}>
        <Input label="Ad Soyad" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="E-posta" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input
          label="Sifre"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        <Button className="w-full" disabled={loading} type="submit">
          {loading ? "Hesap olusturuluyor..." : "Ucretsiz Basla"}
        </Button>
        <p className="text-center text-sm text-[var(--text-3)]">
          Zaten hesabin var mi? <Link href="/giris" className="text-sky-600">Giris Yap</Link>
        </p>
      </form>
    </Card>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      await forgotPassword(email);
      toast.success("Sifre sifirlama baglantisi gonderildi.");
    } catch (error) {
      toast.error(mapAuthError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Sifremi unuttum" description="Kayitli e-posta adresinize sifirlama baglantisi gonderelim.">
      <form className="space-y-4" onSubmit={onSubmit}>
        <Input label="E-posta" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Button className="w-full" disabled={loading} type="submit">
          {loading ? "Gonderiliyor..." : "Sifirlama Baglantisi Gonder"}
        </Button>
      </form>
    </Card>
  );
}
