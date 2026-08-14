"use client";

import { useBusinessContext } from "@/features/businesses/business-context";

export function useBusiness() {
  return useBusinessContext();
}
