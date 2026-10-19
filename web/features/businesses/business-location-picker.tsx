"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { toast } from "sonner";
import { CheckCircle2, Crosshair, Info, LoaderCircle, MapPin, RotateCcw, Save } from "lucide-react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getFirebaseApp } from "@/lib/firebase/client";
import { tk } from "@/i18n/config";
import { useT } from "@/i18n/client";
import type { Business } from "@/types/business";
import styles from "./business-location-picker.module.css";

// Ücretsiz, anahtarsız vektör harita (OpenStreetMap verisi). Atıf haritanın köşesinde otomatik görünür.
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const TURKEY_CENTER: [number, number] = [35.2, 39.0];

type Point = { lat: number; lng: number };
type Geo = NonNullable<Business["geo"]>;

const call = <I, O>(name: string) => httpsCallable<I, O>(getFunctions(getFirebaseApp(), "europe-west1"), name);

/** Başlık ve not çeviri anahtarıdır; gösterirken t() ile çevrilir. */
function precisionText(geo: Geo | undefined) {
  if (!geo) return { tone: "warn", title: tk("Konum henüz bulunamadı"), note: tk("Haritada kapınızı işaretleyin; müşteriler sizi “Yakınımdaki işletmeler”de doğru mesafeyle görsün.") };
  if (geo.precision === "pin") return { tone: "ok", title: tk("Tam konum işaretli"), note: tk("Müşteriler size olan uzaklığı metre hassasiyetinde görür.") };
  if (geo.precision === "address") return { tone: "info", title: tk("Adresten otomatik bulundu"), note: tk("Genelde doğrudur; sapma varsa pini kapınıza sürükleyip kaydedin.") };
  return { tone: "warn", title: geo.precision === "district" ? tk("Yaklaşık konum (ilçe merkezi)") : tk("Yaklaşık konum (il merkezi)"), note: tk("Adresiniz haritada tam bulunamadı. Pini kapınıza taşıyıp kaydedin; mesafeler doğru görünsün.") };
}

/**
 * İşletme ayarları → Konum: haritada sürüklenebilir pin. Kaydetme sunucuda doğrulanır
 * (Türkiye içinde, adresteki ilçeye en fazla 40 km); işletme istemciden "geo" yazamaz.
 */
export function BusinessLocationPicker({ business, onSaved, disabled }: { business: Business; onSaved: (geo: Geo | undefined) => void; disabled?: boolean }) {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [draft, setDraft] = useState<Point | null>(business.geo ? { lat: business.geo.lat, lng: business.geo.lng } : null);
  const [mapState, setMapState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState<"" | "save" | "reset" | "locate">("");
  const geo = business.geo;
  const dirty = Boolean(draft && (!geo || Math.abs(draft.lat - geo.lat) > 1e-6 || Math.abs(draft.lng - geo.lng) > 1e-6));
  const status = precisionText(geo);

  const placeMarker = useCallback((point: Point, fly = false) => {
    const map = mapRef.current;
    if (!map) return;
    setDraft(point);
    if (markerRef.current) markerRef.current.setLngLat([point.lng, point.lat]);
    if (fly) map.flyTo({ center: [point.lng, point.lat], zoom: Math.max(map.getZoom(), 16), duration: 900 });
  }, []);

  // Harita yalnız tarayıcıda ve bir kez kurulur; maplibre dinamik yüklenir (sunucu derlemesine girmez).
  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | null = null;
    void (async () => {
      try {
        const maplibre = (await import("maplibre-gl")).default;
        if (cancelled || !containerRef.current) return;
        const start = business.geo ? { lat: business.geo.lat, lng: business.geo.lng } : null;
        map = new maplibre.Map({
          container: containerRef.current,
          style: MAP_STYLE,
          center: start ? [start.lng, start.lat] : TURKEY_CENTER,
          zoom: start ? (business.geo?.precision === "pin" || business.geo?.precision === "address" ? 16 : 13) : 5,
          attributionControl: { compact: true },
          cooperativeGestures: true,
        });
        map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
        const marker = new maplibre.Marker({ color: "#e11d48", draggable: !disabled })
          .setLngLat(start ? [start.lng, start.lat] : TURKEY_CENTER)
          .addTo(map);
        marker.on("dragend", () => {
          const { lat, lng } = marker.getLngLat();
          setDraft({ lat, lng });
        });
        if (!disabled) map.on("click", (event) => { marker.setLngLat(event.lngLat); setDraft({ lat: event.lngLat.lat, lng: event.lngLat.lng }); });
        map.on("load", () => { if (!cancelled) setMapState("ready"); });
        // i18n-ignore (konsol günlüğü)
        map.on("error", (event) => { if (!map?.loaded() && !cancelled) { console.warn("Harita yüklenemedi", event.error); setMapState("error"); } });
        mapRef.current = map;
        markerRef.current = marker;
      } catch (error) {
        console.warn("Harita başlatılamadı", error); // i18n-ignore
        if (!cancelled) setMapState("error");
      }
    })();
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Harita bir kez kurulur; sonraki konum değişiklikleri marker üzerinden uygulanır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function useMyLocation() {
    if (!("geolocation" in navigator)) { toast.error(t("Tarayıcınız konum özelliğini desteklemiyor.")); return; }
    setBusy("locate");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBusy("");
        placeMarker({ lat: position.coords.latitude, lng: position.coords.longitude }, true);
        toast.success(t("Bulunduğunuz konum işaretlendi."), { description: position.coords.accuracy > 100 ? t("Doğruluk ~{meters} m; gerekirse pini düzeltin.", { meters: Math.round(position.coords.accuracy) }) : t("Kaydetmeyi unutmayın.") });
      },
      (error) => {
        setBusy("");
        toast.error(error.code === error.PERMISSION_DENIED ? t("Konum izni verilmedi. Pini haritada elle taşıyabilirsiniz.") : t("Konum alınamadı. Pini haritada elle taşıyabilirsiniz."));
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  async function save() {
    if (!draft) return;
    setBusy("save");
    try {
      const result = await call<{ businessId: string; lat: number; lng: number }, { lat: number; lng: number }>("setBusinessLocation")({ businessId: business.id, lat: draft.lat, lng: draft.lng });
      onSaved({ lat: result.data.lat, lng: result.data.lng, precision: "pin" });
      toast.success(t("Konum kaydedildi."), { description: t("Keşfet'te mesafeniz artık tam konumdan hesaplanır.") });
    } catch (error) {
      toast.error(error instanceof Error ? t(error.message.replace(/^Firebase:\s*/i, "")) : t("Konum kaydedilemedi."));
    } finally { setBusy(""); }
  }

  async function reset() {
    setBusy("reset");
    try {
      await call<{ businessId: string; reset: true }, { success: boolean }>("setBusinessLocation")({ businessId: business.id, reset: true });
      onSaved(undefined);
      toast.success(t("Otomatik konuma dönüldü."), { description: t("Adresiniz birkaç saniye içinde haritada yeniden aranır.") });
    } catch (error) {
      toast.error(error instanceof Error ? t(error.message.replace(/^Firebase:\s*/i, "")) : t("İşlem tamamlanamadı."));
    } finally { setBusy(""); }
  }

  return (
    <div className={styles.picker}>
      <div className={styles.status} data-tone={status.tone} role="status">
        {status.tone === "ok" ? <CheckCircle2 size={18} aria-hidden /> : <MapPin size={18} aria-hidden />}
        <span><b>{t(status.title)}</b><small>{t(status.note)}</small></span>
      </div>

      <div className={styles.mapWrap}>
        <div ref={containerRef} className={styles.map} aria-label={t("İşletme konumu haritası")} />
        {mapState !== "ready" ? (
          <div className={styles.overlay}>
            {mapState === "loading" ? <><LoaderCircle size={20} className={styles.spin} aria-hidden /> {t("Harita yükleniyor…")}</> : <>{t("Harita yüklenemedi. Sayfayı yenileyip tekrar deneyin.")}</>}
          </div>
        ) : null}
      </div>

      <p className={styles.hint}><Info size={14} aria-hidden /> {t("Haritaya dokunun ya da kırmızı pini kapınıza sürükleyin. Konum, profil onayı beklemeden hemen kaydedilir. Haritayı yakınlaştırmak için iki parmak (bilgisayarda Ctrl/⌘ + tekerlek) kullanın.")}</p>

      {!disabled ? (
        <div className={styles.actions}>
          <button type="button" className={styles.ghost} onClick={useMyLocation} disabled={busy !== "" || mapState !== "ready"}>
            {busy === "locate" ? <LoaderCircle size={16} className={styles.spin} aria-hidden /> : <Crosshair size={16} aria-hidden />} {t("Şu an işletmedeyim")}
          </button>
          {geo?.precision === "pin" ? (
            <button type="button" className={styles.ghost} onClick={() => void reset()} disabled={busy !== ""}>
              {busy === "reset" ? <LoaderCircle size={16} className={styles.spin} aria-hidden /> : <RotateCcw size={16} aria-hidden />} {t("Adresten otomatik bul")}
            </button>
          ) : null}
          <button type="button" className={styles.primary} onClick={() => void save()} disabled={!dirty || busy !== ""}>
            {busy === "save" ? <LoaderCircle size={16} className={styles.spin} aria-hidden /> : <Save size={16} aria-hidden />} {t("Konumu kaydet")}
          </button>
        </div>
      ) : null}
      {draft ? <p className={styles.coords}>{draft.lat.toFixed(6)}, {draft.lng.toFixed(6)}{dirty ? ` · ${t("kaydedilmedi")}` : ""}</p> : null}
    </div>
  );
}
