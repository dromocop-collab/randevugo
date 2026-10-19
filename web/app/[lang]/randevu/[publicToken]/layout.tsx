import type { Metadata } from "next";
import type { ReactNode } from "react";

import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Randevu Detayı"), robots: { index: false, follow: false } };
}

export default function PublicAppointmentLayout({ children }: { children: ReactNode }) { return children; }
