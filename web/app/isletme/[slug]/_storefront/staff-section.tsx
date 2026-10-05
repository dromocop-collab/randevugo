"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { CalendarCheck2, Star } from "lucide-react";
import type { Review } from "@/types/review";
import type { ServiceCategory } from "@/types/service-category";
import type { Staff } from "@/types/staff";
import { initials } from "./utils";
import styles from "../storefront.module.css";

const LEVEL_LABELS: Record<NonNullable<Staff["expertiseLevel"]>, string> = {
  junior: "Gelişen uzman",
  specialist: "Uzman",
  senior: "Kıdemli",
  trainer: "Eğitmen",
};

export function StaffSection({ staff, categories, reviews, bookingHref }: { staff: Staff[]; categories: ServiceCategory[]; reviews: Review[]; bookingHref: string }) {
  const sorted = [...staff].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return (
    <div className={styles.rail} role="list" aria-label="Ekip üyeleri">
      {sorted.map((member, index) => {
        const memberReviews = reviews.filter((review) => review.staffId === member.id);
        const rating = memberReviews.length ? memberReviews.reduce((total, review) => total + review.rating, 0) / memberReviews.length : 0;
        const specialties = categories.filter((category) => member.specialtyCategoryIds?.includes(category.id)).map((category) => category.name);
        return (
          <article key={member.id} className={styles.staffCard} role="listitem" style={{ "--i": Math.min(index, 8) } as CSSProperties}>
            <div className={styles.staffPhoto}>
              {member.photoUrl
                ? <Image src={member.photoUrl} alt={member.fullName} fill sizes="(max-width: 640px) 72vw, 230px" />
                : <span className={styles.staffInitials} aria-hidden="true">{initials(member.fullName)}</span>}
              {member.expertiseLevel && member.expertiseLevel !== "specialist" && <span className={styles.staffLevel}>{LEVEL_LABELS[member.expertiseLevel]}</span>}
              {rating > 0 && <span className={styles.staffRating}><Star size={12} aria-hidden="true" /> {rating.toFixed(1)} <small>({memberReviews.length})</small></span>}
            </div>
            <div className={styles.staffBody}>
              <h3>{member.fullName}</h3>
              <p>{member.position || LEVEL_LABELS[member.expertiseLevel ?? "specialist"]}</p>
              {(specialties.length > 0 || member.bio) && <small>{specialties.length > 0 ? specialties.join(" · ") : member.bio}</small>}
            </div>
            <Link href={`${bookingHref}?staff=${encodeURIComponent(member.id)}`} className={styles.staffBook} aria-label={`${member.fullName} ile randevu al`}>
              <CalendarCheck2 size={16} aria-hidden="true" /> Randevu al
            </Link>
          </article>
        );
      })}
    </div>
  );
}
