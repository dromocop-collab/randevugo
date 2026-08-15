"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { BookingWizard } from "@/components/booking/booking-wizard";
import {
  getBusinessBySlug,
  listBusinessWorkingHours,
} from "@/features/businesses/business-repository";
import type { Business, DaySchedule } from "@/types/business";

export default function BookingPage() {
  const params = useParams<{ slug: string }>();
  const [preselectedServiceId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("service");
  });

  const [business, setBusiness] = useState<Business | null>(null);
  const [workingHours, setWorkingHours] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const slug = params.slug;
    if (!slug) return;

    let cancelled = false;

    getBusinessBySlug(slug)
      .then(async (row) => {
        if (cancelled) return;
        if (!row) {
          setError("İşletme bulunamadı.");
          return;
        }
        if (row.status === "suspended") {
          setError("Bu işletme şu anda aktif değil.");
          return;
        }

        setBusiness(row);

        const schedules = await listBusinessWorkingHours(row.id);
        if (cancelled) return;
        setWorkingHours(schedules);
      })
      .catch((e) => {
        if (cancelled) return;
        setError((e as Error).message);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params.slug]);

  if (loading) {
    return (
      <LoadingState
        title="Randevu sistemi yükleniyor"
        description="İşletme bilgileri getiriliyor..."
      />
    );
  }

  if (error || !business) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10">
        <ErrorState
          title="Randevu Oluşturulamıyor"
          description={error ?? "İşletme kaydı bulunamadı."}
        />
        <div className="mt-6 text-center">
          <Link
            href="/kesfet"
            className="text-sm text-[var(--accent)] hover:underline"
          >
            ← İşletmelere Göz At
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Compact Header */}
      <header className="border-b border-[var(--border)] bg-[var(--bg-1)]/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold text-[var(--text-1)]"
          >
            <Image src="/logo.png" alt="SeninRandevun" width={28} height={28} className="rounded-lg" />
            SeninRandevun
          </Link>
          <Link
            href={`/isletme/${params.slug}`}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--text-3)] hover:text-[var(--text-1)] transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            İşletme Sayfasına Dön
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text-1)]">
            {business.name}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-3)]">
            Online randevu oluşturun
          </p>
        </div>

        <BookingWizard
          businessId={business.id}
          businessName={business.name}
          businessPhone={business.phone}
          businessEmail={business.email}
          businessAddress={`${business.address}, ${business.district}, ${business.city}`}
          businessSlug={business.slug}
          businessHours={workingHours}
          minimumBookingNoticeMinutes={business.minimumBookingNoticeMinutes}
          appointmentBufferMinutes={business.appointmentBufferMinutes}
          maximumBookingDaysAhead={business.maximumBookingDaysAhead}
          slotIntervalMinutes={business.slotIntervalMinutes ?? 15}
          preselectedServiceId={preselectedServiceId}
        />
      </main>
    </div>
  );
}
