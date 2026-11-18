"use client";

import { useEffect } from "react";
import { captureAttribution } from "./attribution";
import { captureReferral } from "@/features/referral/referral";

/** Reklam linkinden gelen ilk sayfada UTM'i yakalar (AppProviders içinde, her sayfada). */
export function AttributionCapture() {
  useEffect(() => { captureAttribution(); captureReferral(); }, []);
  return null;
}
