"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ErrorState } from "@/components/ui/states";
import { BookingWizard } from "@/components/booking/booking-wizard";
import {
  getBusinessBySlug,
  listBusinessWorkingHours,
} from "@/features/businesses/business-repository";
import { listBookableServices } from "@/features/services/service-repository";
import type { Business, DaySchedule } from "@/types/business";
import { ArrowLeft, BadgeCheck, Clock3, MapPin, ShieldCheck, Sparkles, Star } from "lucide-react";
import styles from "./randevu.module.css";

export default function BookingPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const [preselectedServiceId] = useState<string | null>(searchParams.get("service"));
  const [preselectedStaffId] = useState<string | null>(searchParams.get("staff"));
  const [preselectedDate] = useState<string | null>(searchParams.get("date"));
  const [preselectedStartAtMillis] = useState<number | null>(() => {
    const value = Number(searchParams.get("start"));
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  });

  const [business, setBusiness] = useState<Business | null>(null);
  const [workingHours, setWorkingHours] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const slug = params.slug;
    if (!slug) return;

    let cancelled = false;
    // Bağlantı takılırsa sonsuz iskelet yerine anlaşılır hata ve "tekrar dene" gösterilir.
    const timeout = new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("Bağlantı yavaş görünüyor. Lütfen tekrar deneyin.")), 15_000));

    Promise.race([getBusinessBySlug(slug), timeout])
      .then(async (row) => {
        if (cancelled) return;
        if (!row) {
          setError("İşletme bulunamadı.");
          return;
        }
        if (row.status !== "active" || !row.isPublished) {
          setError("Bu işletme şu anda aktif değil.");
          return;
        }
        if (row.allowOnlineBooking === false) {
          setError("Bu işletme randevularını şu anda doğrudan yönetiyor.");
          return;
        }

        const [schedules, services] = await Promise.race([Promise.all([
          listBusinessWorkingHours(row.id),
          listBookableServices(row.id),
        ]), timeout]);
        if (cancelled) return;
        if (services.length === 0) {
          setError("Bu işletme henüz online randevu kabul etmiyor.");
          return;
        }
        setBusiness(row);
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
  }, [params.slug, retryKey]);

  const shellHeader = (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.brand}>
          <Image src="/logo.png" alt="" width={30} height={30} />
          SeninRandevun
        </Link>
        <Link href={`/isletme/${params.slug}`} className={styles.back}>
          <ArrowLeft size={17} />
          <span className={styles.backShort}>İşletme</span>
          <span className={styles.backLong}>İşletme sayfasına dön</span>
        </Link>
      </div>
    </header>
  );

  if (loading) {
    return (
      <div className={styles.page}>
        {shellHeader}
        <main className={styles.main} aria-busy="true">
          <p className="sr-only" role="status">Randevu sistemi yükleniyor…</p>
          <div className={styles.skeleton} aria-hidden="true">
            <i style={{ height: 132 }} />
            <i style={{ height: 96 }} />
            <i style={{ height: 300 }} />
          </div>
        </main>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className={styles.page}>
        {shellHeader}
        <main className={styles.state}>
          <ErrorState
            title="Randevu Oluşturulamıyor"
            description={error ?? "İşletme kaydı bulunamadı."}
            action={error?.startsWith("Bağlantı") ? <button type="button" className={styles.stateLink} onClick={() => { setError(null); setLoading(true); setRetryKey((value) => value + 1); }}>Tekrar dene</button> : undefined}
          />
          <Link href="/kesfet" className={styles.stateLink}>
            ← İşletmelere göz at
          </Link>
        </main>
      </div>
    );
  }

  const location = [business.district, business.city].filter(Boolean).join(", ");

  return (
    <div className={styles.page}>
      {shellHeader}

      <main className={styles.main}>
        <section className={styles.hero}>
          {business.coverUrl && <div className={styles.heroCover} aria-hidden="true"><Image src={business.coverUrl} alt="" fill sizes="680px" priority /></div>}
          <div className={styles.heroGrid} aria-hidden="true" />
          <div className={styles.heroRow}>
            <div className={styles.logo}>
              {business.logoUrl ? <Image src={business.logoUrl} alt={`${business.name} logosu`} fill sizes="68px" /> : business.name.charAt(0).toLocaleUpperCase("tr-TR")}
            </div>
            <div className={styles.heroText}>
              <span className={styles.eyebrow}><Sparkles size={12} /> ONLINE RANDEVU</span>
              <h1 className={styles.title}>{business.name}</h1>
              {location && <span className={styles.location}><MapPin size={14} /> {location}</span>}
            </div>
          </div>
          <div className={styles.chips}>
            <span className={styles.chip}><Clock3 size={13} /> Yaklaşık 2 dakika</span>
            <span className={styles.chip}><ShieldCheck size={13} /> SMS ile güvenli doğrulama</span>
            <span className={styles.chip}><BadgeCheck size={13} /> Anında onay</span>
            {business.rating > 0 && <span className={styles.chip}><Star size={13} /> {business.rating.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}</span>}
          </div>
        </section>

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
          preselectedStaffId={preselectedStaffId}
          preselectedDate={preselectedDate && /^\d{4}-\d{2}-\d{2}$/.test(preselectedDate) ? preselectedDate : null}
          preselectedStartAtMillis={preselectedStartAtMillis}
          businessAlertsEnabled={business.availabilityAlertsEnabled === true}
        />
      </main>
    </div>
  );
}
