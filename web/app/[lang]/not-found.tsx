import type { Metadata } from "next";
import Link from "@/i18n/link";
import { getT } from "@/i18n/server";
import { RoviMascot } from "@/components/brand/rovi-mascot";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Sayfa Bulunamadı"),
    description: t("Aradığınız sayfa bulunamadı."),
    robots: { index: false, follow: false },
  };
}

export default async function NotFound() {
  const t = await getT();
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-1)] px-6 text-center">
      <div>
        <RoviMascot size={170} mood="thinking" alt={t("Rovi sayfayı arıyor")} priority className="mx-auto mb-4" />
        <p className="text-sm font-bold text-emerald-600">404</p>
        <h1 className="mt-3 text-4xl font-bold text-[var(--text-1)]">{t("Bu sayfa bulunamadı.")}</h1>
        <p className="mt-4 text-[var(--text-3)]">{t("Rovi her yere baktı ama bulamadı. Bağlantı değişmiş veya sayfa kaldırılmış olabilir.")}</p>
        <Link className="mt-7 inline-flex rounded-full bg-[#0b6b45] px-6 py-3 font-bold text-white" href="/">
          {t("Ana sayfaya dön")}
        </Link>
        <Link className="ml-3 mt-7 inline-flex rounded-full border border-[var(--border)] px-6 py-3 font-bold text-[var(--text-1)]" href="/kesfet">
          {t("İşletmeleri keşfet")}
        </Link>
      </div>
    </main>
  );
}
