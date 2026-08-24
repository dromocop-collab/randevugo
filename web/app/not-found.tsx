import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sayfa Bulunamadı",
  description: "Aradığınız sayfa bulunamadı.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-center">
      <div>
        <p className="text-sm font-bold text-[#0b6b45]">404</p>
        <h1 className="mt-3 text-4xl font-bold text-[#10241c]">Bu sayfa bulunamadı.</h1>
        <p className="mt-4 text-[#60756a]">Bağlantı değişmiş veya sayfa kaldırılmış olabilir.</p>
        <Link className="mt-7 inline-flex rounded-full bg-[#0b6b45] px-6 py-3 font-bold text-white" href="/">
          Ana sayfaya dön
        </Link>
      </div>
    </main>
  );
}
