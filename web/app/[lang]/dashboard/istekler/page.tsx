"use client";

import { FeatureBoard } from "@/features/feature-requests/feature-board";
import { useBusiness } from "@/hooks/use-business";

// Panelden istek & öneri: aynı pano, gönderilen istek işletmeyle ilişkilendirilir (yönetici kimden geldiğini görür).
export default function DashboardFeatureRequestsPage() {
  const { businessId } = useBusiness();
  return <FeatureBoard variant="dashboard" businessId={businessId} />;
}
