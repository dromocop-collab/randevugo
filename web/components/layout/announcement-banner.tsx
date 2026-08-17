"use client";

import { useEffect, useState } from "react";
import { getPlatformSettings } from "@/features/platform/platform-settings-repository";
import type { PlatformAnnouncement } from "@/types/platform";

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<PlatformAnnouncement | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    getPlatformSettings()
      .then((settings) => setAnnouncement(settings.announcement))
      .catch(() => setAnnouncement(null));
  }, []);

  if (!announcement?.enabled || !announcement.message || dismissed) return null;

  return (
    <div className="relative flex items-center justify-center gap-3 bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] px-4 py-2.5 text-center text-sm font-medium text-white">
      <span>{announcement.message}</span>
      {announcement.linkUrl && announcement.linkText && (
        <a href={announcement.linkUrl} className="underline underline-offset-2 hover:opacity-90">
          {announcement.linkText}
        </a>
      )}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Kapat"
        className="absolute right-3 text-white/80 hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}
