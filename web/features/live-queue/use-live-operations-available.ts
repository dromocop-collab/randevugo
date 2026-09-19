"use client";

import { useEffect, useState } from "react";
import { useBusinessContext } from "@/features/businesses/business-context";
import { subscribeLiveFeatureAvailability } from "@/features/platform/platform-settings-repository";
import { isBusinessLiveOperationsEnabled, resolveLiveFeatureAvailability } from "@/features/platform/live-feature-flags";

export function useLiveOperationsAvailable() {
  const { businesses, businessId, access } = useBusinessContext();
  const [availability, setAvailability] = useState<ReturnType<typeof resolveLiveFeatureAvailability> | null>(null);
  useEffect(() => subscribeLiveFeatureAvailability(setAvailability), []);
  const business = businesses.find((item) => item.id === businessId);
  return !!availability && isBusinessLiveOperationsEnabled(availability, business?.liveQueueEnabled) &&
    !!access && access.role !== "staff";
}
