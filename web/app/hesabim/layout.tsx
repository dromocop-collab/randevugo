import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Hesabım ve Randevularım", robots: { index: false, follow: false } };

export default function CustomerAccountLayout({ children }: { children: ReactNode }) { return children; }
