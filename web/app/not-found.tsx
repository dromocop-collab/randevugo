import type { Metadata } from "next";
import Link from "next/link";
import { RoviMascot } from "@/components/brand/rovi-mascot";

export const metadata: Metadata = {
  title: "Sayfa Bulunamadı",
  description: "Aradığınız sayfa bulunamadı.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-1)] px-6 text-center">
      <div>
        <RoviMascot size={170} mood="thinking" alt="Rovi sayfayı arıyor" priority className="mx-auto mb-4" />
        <p className="text-sm font-bold text-emerald-600">404</p>
        <h1 className="mt-3 text-4xl font-bold text-[var(--text-1)]">Bu sayfa bulunamadı.</h1>
        <p className="mt-4 text-[var(--text-3)]">Rovi her yere baktı ama bulamadı. Bağlantı değişmiş veya sayfa kaldırılmış olabilir.</p>
        <Link className="mt-7 inline-flex rounded-full bg-[#0b6b45] px-6 py-3 font-bold text-white" href="/">
          Ana sayfaya dön
        </Link>
        <Link className="ml-3 mt-7 inline-flex rounded-full border border-[var(--border)] px-6 py-3 font-bold text-[var(--text-1)]" href="/kesfet">
          İşletmeleri keşfet
        </Link>
      </div>
    </main>
  );
}
