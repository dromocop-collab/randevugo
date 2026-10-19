import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Randevu Oluştur",
  robots: { index: false, follow: false, noarchive: true },
};

export default function BookingFlowLayout({ children }: { children: React.ReactNode }) {
  return children;
}
