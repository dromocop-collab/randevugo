"use client";

import type { Staff } from "@/types/staff";

interface Props {
  staff: Staff[];
}

export function StorefrontStaff({ staff }: Props) {
  if (staff.length === 0) return null;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-lg shadow-[var(--shadow-soft)] backdrop-blur-xl">
      <h2 className="text-lg font-semibold text-[var(--text-1)]">Ekibimiz</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {staff.map((member) => (
          <div
            key={member.id}
            className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 transition hover:bg-[var(--field-bg-hover)]"
          >
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl">
              {member.photoUrl ? (
                <img
                  src={member.photoUrl}
                  alt={member.fullName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--accent)] to-[var(--accent-3)]">
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
            <div>
              <p className="text-sm font-medium text-[var(--text-1)]">
                {member.fullName}
              </p>
              {member.position && (
                <p className="text-xs text-[var(--text-3)]">{member.position}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
