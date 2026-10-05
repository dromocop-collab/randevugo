"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { logSurveyEvent, type SurveyEventType } from "@/features/survey/survey-events";

/** Sunucu bileşenindeki bağlantılar için huni ölçümlü Link (fire-and-forget). */
export function TrackedLink({ event, onClick, ...props }: ComponentProps<typeof Link> & { event: SurveyEventType }) {
  return (
    <Link
      {...props}
      onClick={(clickEvent) => {
        logSurveyEvent(event);
        onClick?.(clickEvent);
      }}
    />
  );
}
