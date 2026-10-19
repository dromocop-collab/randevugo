import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Canlı Sıraya Katıl",
  robots: { index: false, follow: false, noarchive: true },
};

export default function LiveQueueFlowLayout({ children }: { children: React.ReactNode }) {
  return children;
}
