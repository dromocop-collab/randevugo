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
import { ArrowLeft, Clock3, ShieldCheck, Sparkles } from "lucide-react";

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
    <div className="booking-page min-h-screen">
      {/* Compact Header */}
      <header className="booking-header sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg-1)]/80 backdrop-blur-xl">
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
            <ArrowLeft size={17} />
            İşletme Sayfasına Dön
          </Link>
        </div>
      </header>

      <main className="booking-main mx-auto w-full max-w-5xl px-4 py-10">
        <div className="booking-intro mx-auto mb-7 max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/15 bg-[var(--accent)]/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.15em] text-[var(--accent)]"><Sparkles size={13} /> Kolay randevu</span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[var(--text-1)] sm:text-4xl">
            {business.name}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-3)]">
            Hizmetinizi seçin, uygun saati bulun; kalanını biz kolaylaştıralım.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-[10px] font-semibold text-[var(--text-3)]"><span><Clock3 size={13} /> Yaklaşık 2 dakika</span><span><ShieldCheck size={13} /> Güvenli doğrulama</span></div>
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
