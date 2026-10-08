"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useBusiness } from "@/hooks/use-business";
import { isCompanionRoute } from "@/features/business-companion/companion-domain";
import { useCompanionHidden } from "@/features/business-companion/companion-settings";
import { useCompanionPreviewFlag } from "@/features/business-companion/preview-flag";

/*
 * Bu dosya her sayfada yüklenir; bu yüzden hafif tutulur. Canlı dinleyici + arayüz ayrı bir
 * parçada (chunk) ve yalnızca işletme erişimi olan girişli kullanıcıda, herkese açık sayfada indirilir.
 * Anonim/müşteri kullanıcıda hiçbir Firestore dinleyicisi açılmaz, parça indirilmez.
 */
const LiveBusinessCompanion = dynamic(() => import("@/features/business-companion/business-companion"), { ssr: false });

// Geliştirme önizlemesi: üretimde koşul sabit `false` olur, import dalı ve modül paketten atılır.
const CompanionPreview = process.env.NODE_ENV !== "production"
  ? dynamic(() => import("@/features/business-companion/companion-preview"), { ssr: false })
  : null;

export function BusinessCompanionGate() {
  const pathname = usePathname();
  const { status, user } = useAuth();
  const { businesses, access } = useBusiness();
  const hidden = useCompanionHidden();
  const preview = useCompanionPreviewFlag(pathname);

  if (!isCompanionRoute(pathname)) return null;
  if (CompanionPreview && preview) return <CompanionPreview />;
  if (status !== "authenticated" || !user || hidden || !access || businesses.length === 0) return null;
  return <LiveBusinessCompanion />;
}
