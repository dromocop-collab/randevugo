"use client";

import type { Staff } from "@/types/staff";
import { BadgeCheck, UserRound } from "lucide-react";

interface Props {
  staff: Staff[];
}

export function StorefrontStaff({ staff }: Props) {
  if (staff.length === 0) return null;

  return (
    <section className="storefront-staff-section">
      <header><span><UserRound size={18}/></span><div><small>UZMAN KADRO</small><h2>Sizinle ilgilenecek ekip.</h2></div><b>{staff.length} uzman</b></header>
      <div className="storefront-staff-grid">
        {staff.map((member) => (
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
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
