"use client";

import { useEffect, useState } from "react";
import { useBusinessContext } from "@/features/businesses/business-context";
import { subscribeLiveFeatureAvailability } from "@/features/platform/platform-settings-repository";
import { resolveLiveFeatureAvailability } from "@/features/platform/live-feature-flags";

export function useLiveOperationsAvailable() {
  const { access } = useBusinessContext();
  const [availability, setAvailability] = useState<ReturnType<typeof resolveLiveFeatureAvailability> | null>(null);
  useEffect(() => subscribeLiveFeatureAvailability(setAvailability), []);
  return !!availability && availability.isLiveQueueEnabled && availability.isLiveOperationsEnabled &&
    !!access && access.role !== "staff";
}
