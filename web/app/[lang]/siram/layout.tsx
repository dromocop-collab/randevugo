import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Canlı Sıramı Takip Et",
  description: "Katıldığınız canlı sıranın güncel durumunu güvenle takip edin.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function MyQueueLayout({ children }: { children: React.ReactNode }) {
  return children;
}
