"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PublicBookingFlow } from "@/components/booking/public-booking-flow";
import { ErrorState, LoadingState } from "@/components/ui/states";
import {
  getBusinessBySlug,
  listBusinessWorkingHours,
} from "@/features/businesses/business-repository";
import type { Business, DaySchedule } from "@/types/business";

export default function BusinessBookingPage() {
  const params = useParams<{ businessSlug: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [workingHours, setWorkingHours] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const slug = params.businessSlug;
    if (!slug) return;

    let cancelled = false;

    getBusinessBySlug(slug)
      .then(async (row) => {
        if (cancelled) return;
        if (!row) {
          setError("Isletme bulunamadi.");
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
  }, [params.businessSlug]);

  if (loading) {
    return <LoadingState title="Randevu sayfasi yukleniyor" description="Isletme bilgileri kontrol ediliyor." />;
  }

  if (error || !business) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10">
        <ErrorState
          title="Sayfa Acilamadi"
          description={error ?? "Isletme kaydi bulunamadi."}
        />
      </main>
    );
  }

  return (
    <PublicBookingFlow
      businessId={business.id}
      businessName={business.name}
      businessPhone={business.phone}
      businessEmail={business.email}
      businessHours={workingHours}
      minimumBookingNoticeMinutes={business.minimumBookingNoticeMinutes}
      appointmentBufferMinutes={business.appointmentBufferMinutes}
      maximumBookingDaysAhead={business.maximumBookingDaysAhead}
    />
  );
}
