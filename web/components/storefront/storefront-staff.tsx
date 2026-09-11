"use client";

import type { Staff } from "@/types/staff";
import type { ServiceCategory } from "@/types/service-category";
import type { Review } from "@/types/review";
import { BadgeCheck, Star, UserRound } from "lucide-react";

interface Props {
  staff: Staff[];
  categories: ServiceCategory[];
  reviews: Review[];
}

const LEVEL_LABELS: Record<NonNullable<Staff["expertiseLevel"]>, string> = {
  junior: "Gelişen uzman",
  specialist: "Uzman",
  senior: "Kıdemli uzman",
  trainer: "Eğitmen / Usta",
};

export function StorefrontStaff({ staff, categories, reviews }: Props) {
  if (staff.length === 0) return null;

  return (
    <section className="storefront-staff-section">
      <header><span><UserRound size={18}/></span><div><small>UZMAN KADRO</small><h2>Sizinle ilgilenecek ekip.</h2></div><b>{staff.length} uzman</b></header>
      <div className="storefront-staff-grid">
        {staff.map((member) => {
          const memberReviews = reviews.filter((review) => review.staffId === member.id);
          const rating = memberReviews.length ? memberReviews.reduce((total, review) => total + review.rating, 0) / memberReviews.length : 0;
          const specialties = categories.filter((category) => member.specialtyCategoryIds?.includes(category.id));
          return (
          <div
            key={member.id}
            className="storefront-staff-card"
          >
            <div className="storefront-staff-photo">
              {member.photoUrl ? (
                <img
                  src={member.photoUrl}
                  alt={member.fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div>
                  <span className="text-sm font-bold text-white">
                    {member.fullName
                      .split(" ")
                      .map((n) => n.charAt(0))
                      .join("")
                      .slice(0, 2)}
                  </span>
                </div>
              )}
            </div>
            <div className="storefront-staff-info">
              <small><BadgeCheck size={12}/> ONAYLI UZMAN</small>
              <p>{member.fullName}</p>
              {member.position && (
                <span>{member.position}</span>
              )}
              <span>{LEVEL_LABELS[member.expertiseLevel ?? "specialist"]}</span>
              {specialties.length > 0 && <span>{specialties.map((category) => category.name).join(" · ")}</span>}
              {rating > 0 && <span><Star size={12} fill="currentColor" /> {rating.toFixed(1)} · {memberReviews.length} değerlendirme</span>}
            </div>
          </div>
          );
        })}
      </div>
    </section>
  );
}
