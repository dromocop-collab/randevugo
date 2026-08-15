"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { doc, getDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/firestore";
import { LoadingState, ErrorState } from "@/components/ui/states";
import type { Appointment } from "@/types/appointments";

export default function AppointmentDetailPage() {
  const params = useParams<{ publicToken: string }>();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [businessName, setBusiness] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.publicToken;
    if (!token) return;

    let cancelled = false;
    const db = getDb();

    (async () => {
      try {
        // Lookup token mapping
        const tokenRef = doc(db, "appointmentTokens", token);
        const tokenSnap = await getDoc(tokenRef);

        if (!tokenSnap.exists()) {
          setError("Randevu bulunamadı veya geçersiz bağlantı.");
          return;
        }

        const tokenData = tokenSnap.data();
        const businessId = String(tokenData.businessId ?? "");
        const appointmentId = String(tokenData.appointmentId ?? "");

        if (!businessId || !appointmentId) {
          setError("Randevu bilgilerine ulaşılamadı.");
          return;
        }

        // Get appointment
        const appointmentRef = doc(
          db,
          "businesses",
          businessId,
          "appointments",
          appointmentId
        );
        const appointmentSnap = await getDoc(appointmentRef);

        if (!appointmentSnap.exists()) {
          setError("Randevu kaydı bulunamadı.");
          return;
        }

        if (cancelled) return;

        const data = appointmentSnap.data();
        setAppointment({
          id: appointmentSnap.id,
          ...data,
          startAt: data.startAt?.toDate?.()
            ? data.startAt.toDate().toISOString()
            : String(data.startAt ?? ""),
          endAt: data.endAt?.toDate?.()
            ? data.endAt.toDate().toISOString()
            : String(data.endAt ?? ""),
          createdAt: data.createdAt?.toDate?.()
            ? data.createdAt.toDate().toISOString()
            : "",
          updatedAt: data.updatedAt?.toDate?.()
            ? data.updatedAt.toDate().toISOString()
            : "",
        } as Appointment);

        // Get business info
        const businessRef = doc(db, "businesses", businessId);
        const businessSnap = await getDoc(businessRef);
        if (businessSnap.exists()) {
          const bData = businessSnap.data();
          setBusiness(String(bData.name ?? ""));
          setBusinessAddress(
            `${bData.address ?? ""}, ${bData.district ?? ""}, ${bData.city ?? ""}`
          );
          setBusinessPhone(String(bData.phone ?? ""));
        }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params.publicToken]);

  if (loading) {
    return (
      <LoadingState
        title="Randevu yükleniyor"
        description="Randevu bilgileriniz getiriliyor..."
      />
    );
  }

  if (error || !appointment) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-10">
        <ErrorState
          title="Randevu Bulunamadı"
          description={error ?? "Randevu kaydına ulaşılamadı."}
        />
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-[var(--accent)] hover:underline"
          >
            ← Ana Sayfaya Dön
          </Link>
        </div>
      </main>
    );
  }

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: "Bekliyor", color: "bg-amber-100 text-amber-700" },
    confirmed: { label: "Onaylandı", color: "bg-emerald-100 text-emerald-700" },
    completed: { label: "Tamamlandı", color: "bg-sky-100 text-sky-700" },
    cancelled: { label: "İptal Edildi", color: "bg-rose-100 text-rose-700" },
    no_show: { label: "Gelmedi", color: "bg-gray-100 text-gray-700" },
  };

  const statusInfo = statusLabels[appointment.status] ?? {
    label: appointment.status,
    color: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex w-full max-w-lg items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold text-[var(--text-1)]"
        >
          <Image src="/logo.png" alt="SeninRandevun" width={28} height={28} className="rounded-lg" />
          SeninRandevun
        </Link>
      </header>

      <main className="mx-auto w-full max-w-lg space-y-5 px-4 pb-20 pt-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-xl shadow-[var(--shadow-soft)] backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-[var(--text-1)]">
              Randevu Detayı
            </h1>
            <span
              className={`rounded-lg px-3 py-1 text-xs font-semibold ${statusInfo.color}`}
            >
              {statusInfo.label}
            </span>
          </div>

          <div className="mt-5 space-y-3">
            <DetailRow label="İşletme" value={businessName} />
            <DetailRow
              label="Hizmet"
              value={appointment.serviceName ?? "—"}
            />
            <DetailRow
              label="Çalışan"
              value={appointment.staffName ?? "—"}
            />
            <DetailRow
              label="Tarih"
              value={
                appointment.startAt
                  ? new Date(appointment.startAt).toLocaleDateString("tr-TR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })
                  : "—"
              }
            />
            <DetailRow
              label="Saat"
              value={
                appointment.startAt
                  ? new Date(appointment.startAt).toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"
              }
            />
            {appointment.servicePrice !== undefined &&
              appointment.servicePrice > 0 && (
                <DetailRow
                  label="Fiyat"
                  value={`${appointment.servicePrice.toLocaleString("tr-TR")} ₺`}
                />
              )}
            <DetailRow label="Adres" value={businessAddress} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {businessPhone && (
            <a
              href={`tel:${businessPhone}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] py-3 text-sm font-medium text-[var(--text-1)] transition hover:bg-[var(--field-bg-hover)]"
            >
              İşletmeyi Ara
            </a>
          )}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessAddress)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] py-3 text-sm font-medium text-[var(--text-1)] transition hover:bg-[var(--field-bg-hover)]"
          >
            Yol Tarifi
          </a>
        </div>
      </main>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-[var(--text-3)]">{label}</span>
      <span className="text-right font-medium text-[var(--text-1)]">
        {value}
      </span>
    </div>
  );
}
