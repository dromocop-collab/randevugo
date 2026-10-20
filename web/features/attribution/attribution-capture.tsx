"use client";

import { useEffect } from "react";
import { captureAttribution } from "./attribution";

/** Reklam linkinden gelen ilk sayfada UTM'i yakalar (AppProviders içinde, her sayfada). */
export function AttributionCapture() {
  useEffect(() => { captureAttribution(); }, []);
  return null;
}
