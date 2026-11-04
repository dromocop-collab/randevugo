"use client";

import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp } from "@/lib/firebase/client";
import { useAuth } from "@/hooks/use-auth";
import { useBusiness } from "@/hooks/use-business";
import { trackAction } from "@/features/analytics/track-action";
import { Button, Callout, Input } from "@/components/dashboard/ui";
import { useT } from "@/i18n/client";

// İşletme kaydında e-posta kodu artık kurulumu beklemiyor (kayıt formu doğrudan /onboarding'e geçer); doğrulama burada.
// Yalnız e-posta/şifreyle açılmış, doğrulanmamış sahip hesaplarına görünür. "Sonra" 3 gün erteler (tarayıcı başına).
const SNOOZE_KEY = "sr-email-verify-snooze";
const SNOOZE_MS = 3 * 86_400_000;

function snoozed() {
  try { return Number(localStorage.getItem(SNOOZE_KEY) ?? 0) > Date.now(); } catch { return false; }
}

const callable = (name: string) => httpsCallable(getFunctions(getFirebaseApp(), "europe-west1"), name);

export function EmailVerifyBanner() {
  const t = useT();
  const { user } = useAuth();
  const { businessId, access } = useBusiness();
  const [hidden, setHidden] = useState(snoozed);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"verify" | "send" | null>(null);
  const [done, setDone] = useState(false);

  const email = user?.email ?? "";
  const passwordAccount = Boolean(user?.providerData.some((item) => item.providerId === "password"));
  if (!user || !email || user.emailVerified || !passwordAccount || done || hidden) return null;
  if (!businessId || access?.role === "staff") return null;

  function errorText(error: unknown, fallback: string) {
    const raw = (error as { message?: string } | null)?.message;
    return raw ? t(raw) : fallback;
  }

  async function send() {
    setBusy("send");
    try {
      await callable("sendEmailVerificationCode")({ email });
      setOpen(true);
      toast.success(t("Kod {email} adresine gönderildi.", { email }));
    } catch (error) {
      toast.error(errorText(error, t("Kod gönderilemedi.")));
    } finally {
      setBusy(null);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (code.length !== 6) { toast.error(t("Lütfen 6 haneli kodu girin.")); return; }
    setBusy("verify");
    try {
      await callable("verifyEmailCode")({ email, code });
      await user?.reload().catch(() => undefined);
      trackAction("signup:verified");
      setDone(true);
      toast.success(t("E-posta doğrulandı! ✅"));
    } catch (error) {
      toast.error(errorText(error, t("Doğrulama başarısız.")));
    } finally {
      setBusy(null);
    }
  }

  function later() {
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS)); } catch { /* gizli sekme: sadece bu açılışta gizle */ }
    setHidden(true);
  }

  return (
    <Callout
      tone="blue"
      icon={MailCheck}
      title={t("E-posta adresini doğrula")}
      action={open ? null : (
        <span className="flex flex-wrap gap-2">
          <Button size="sm" variant="primary" onClick={() => setOpen(true)}>{t("Kodu gir")}</Button>
          <Button size="sm" variant="ghost" onClick={later}>{t("Sonra")}</Button>
        </span>
      )}
    >
      <span className="block text-xs opacity-80">
        {t("{email} adresine 6 haneli bir kod gönderdik. Şifreni unutursan hesabını bu adresle kurtarırsın.", { email })}
      </span>
      {open ? (
        <form className="mt-2 flex flex-wrap items-center gap-2" onSubmit={verify}>
          <Input
            aria-label={t("Doğrulama kodu")}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            className="w-32 tracking-[0.3em]"
            autoFocus
          />
          <Button type="submit" size="sm" variant="primary" loading={busy === "verify"} disabled={code.length !== 6 || busy !== null}>{t("Doğrula")}</Button>
          <Button size="sm" variant="ghost" loading={busy === "send"} disabled={busy !== null} onClick={() => void send()}>{t("Kodu tekrar gönder")}</Button>
        </form>
      ) : null}
    </Callout>
  );
}
