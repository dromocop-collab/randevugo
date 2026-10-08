"use client";

import { BellRing, Play } from "lucide-react";
import { Button, Panel, Switch } from "@/components/dashboard/ui";
import { playNotificationChime, setSoundPreference, unlockNotificationAudio } from "@/features/push/notification-sound";
import { NotificationSoundGrid, SoundVolumeSlider, useSoundPreference } from "@/features/push/notification-sound-picker";
import { getSoundPreset } from "@/features/push/notification-sound-presets";

/**
 * Ayarlar › Randevu Motoru › Bildirimler: "Randevu bildirim sesi".
 * Seçim hesaba kaydedilir (users/{uid}/preferences/notificationSound) ve panel, push ön plan bildirimi
 * ve sitedeki işletme yardımcısı aynı sesi çalar. Hesap eşitlemesi DashboardShell'deki useNotificationSoundSync ile.
 */
export function NotificationSoundSection() {
  const preference = useSoundPreference();
  const current = getSoundPreset(preference.soundId);

  return (
    <Panel
      title="Randevu bildirim sesi"
      description={`Yeni randevu geldiğinde çalar · Seçili: ${current.name}`}
      icon={BellRing}
      actions={
        <Button
          size="sm"
          variant="primary"
          icon={Play}
          disabled={preference.muted || preference.volume === 0}
          onClick={() => {
            unlockNotificationAudio();
            playNotificationChime({ force: true });
          }}
        >
          Test et
        </Button>
      }
    >
      <div style={{ display: "grid", gap: 14 }}>
        <Switch
          checked={preference.muted}
          onChange={(muted) => setSoundPreference({ muted })}
          label="Sesi kapat"
          description="Kapalıyken bildirim kartı ve tarayıcı bildirimi yine görünür, yalnızca ses çalmaz."
        />
        <SoundVolumeSlider preference={preference} />
        <NotificationSoundGrid preference={preference} />
        <p style={{ margin: 0, color: "var(--dui-muted)", fontSize: 12 }}>
          Seçim hesabına kaydedilir; bu tarayıcıda panelde ve giriş yaptığın site sayfalarında aynı ses çalar. iPhone/Android uygulama bildirimleri telefonun kendi sesini kullanır.
        </p>
      </div>
    </Panel>
  );
}
