"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, KeyRound, Link2, LoaderCircle, Unlink } from "lucide-react";
import { getAuth, onIdTokenChanged, type User } from "firebase/auth";
import { getFirebaseApp } from "@/lib/firebase/client";
import { linkSocialProvider, unlinkProvider, type SocialProvider } from "@/features/auth/auth-service";
import styles from "./linked-sign-in-methods.module.css";

const METHODS: Array<{ id: string; provider?: SocialProvider; title: string; note: string }> = [
  { id: "google.com", provider: "google", title: "Google", note: "Google hesabınla tek dokunuşla gir." },
  { id: "apple.com", provider: "apple", title: "Apple", note: "\"E-postamı gizle\" seçsen bile bu hesaba girer." },
  { id: "password", title: "E-posta ve şifre", note: "Şifreyi yenile ile oluşturabilirsin." },
];

function linkError(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  if (code === "auth/credential-already-in-use" || code === "auth/email-already-in-use") {
    return "Bu hesap başka bir SeninRandevun hesabına bağlı. Önce o hesaptan kaldırılması gerekir; destekten yardım isteyebilirsin.";
  }
  if (code === "auth/provider-already-linked") return "Bu yöntem zaten bağlı.";
  if (code === "auth/requires-recent-login") return "Güvenlik için çıkış yapıp tekrar giriş yap, sonra yeniden dene.";
  if (code === "auth/popup-blocked") return "Açılır pencere engellendi. Tarayıcıda açılır pencerelere izin verip tekrar dene.";
  return error instanceof Error && error.message && !error.message.startsWith("Firebase") ? error.message : "İşlem tamamlanamadı. Lütfen tekrar dene.";
}

/** Hesaba bağlı giriş yöntemleri: Google / Apple bağla-kaldır, böylece her yöntem aynı hesaba girer. */
export function LinkedSignInMethods() {
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, setVersion] = useState(0);

  useEffect(() => onIdTokenChanged(getAuth(getFirebaseApp()), setUser), []);
  if (!user) return null;

  const linked = new Set(user.providerData.map((item) => item.providerId));
  const emailFor = (id: string) => user.providerData.find((item) => item.providerId === id)?.email ?? "";

  async function link(provider: SocialProvider, id: string) {
    setBusy(id);
    try {
      await linkSocialProvider(provider);
      await user?.reload();
      setVersion((value) => value + 1);
      toast.success(`${provider === "apple" ? "Apple" : "Google"} girişi hesabına bağlandı.`);
    } catch (error) {
      const code = (error as { code?: string } | null)?.code;
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") toast.error(linkError(error));
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string, title: string) {
    if (!window.confirm(`${title} girişi bu hesaptan kaldırılsın mı? Diğer yöntemlerle girmeye devam edebilirsin.`)) return;
    setBusy(id);
    try {
      await unlinkProvider(id);
      await user?.reload();
      setVersion((value) => value + 1);
      toast.success(`${title} girişi kaldırıldı.`);
    } catch (error) {
      toast.error(linkError(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={styles.list}>
      {METHODS.map((method) => {
        const on = linked.has(method.id);
        const email = on ? emailFor(method.id) : "";
        return (
          <div key={method.id} className={styles.row}>
            <span className={`${styles.icon} ${styles[`icon_${method.id.replace(".com", "")}`] ?? ""}`} aria-hidden="true">
              {method.id === "google.com" ? <GoogleMark /> : method.id === "apple.com" ? <AppleMark /> : <KeyRound size={17} />}
            </span>
            <span className={styles.text}>
              <b>{method.title}{on && <em className={styles.on}><Check size={12} /> Bağlı</em>}</b>
              <small>{on ? (email.endsWith("privaterelay.appleid.com") ? "Gizli Apple e-postası" : email || "Bağlı") : method.note}</small>
            </span>
            {method.provider && (on
              ? linked.size > 1 && <button type="button" className={styles.ghost} onClick={() => remove(method.id, method.title)} disabled={busy !== null} aria-label={`${method.title} bağlantısını kaldır`}>
                  {busy === method.id ? <LoaderCircle size={15} className={styles.spin} /> : <Unlink size={15} />}
                </button>
              : <button type="button" className={styles.link} onClick={() => link(method.provider!, method.id)} disabled={busy !== null}>
                  {busy === method.id ? <LoaderCircle size={15} className={styles.spin} /> : <Link2 size={15} />} Bağla
                </button>)}
          </div>
        );
      })}
    </div>
  );
}

function GoogleMark() {
  return <svg width="17" height="17" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>;
}

function AppleMark() {
  return <svg width="15" height="17" viewBox="0 0 814 1000" fill="currentColor"><path d="M788 341c-6 4-108 62-108 190 0 148 130 200 134 202-1 3-21 72-69 142-43 62-88 124-156 124s-86-40-164-40c-77 0-104 41-167 41s-106-57-156-128C44 790 0 669 0 554c0-185 120-283 239-283 63 0 115 41 155 41 38 0 97-44 169-44 27 0 125 2 190 73zM554 168c30-35 51-84 51-133 0-7-1-14-2-19-49 2-107 33-142 73-27 31-53 80-53 130 0 8 1 15 2 18 3 1 9 2 14 2 44 0 99-30 130-71z"/></svg>;
}
