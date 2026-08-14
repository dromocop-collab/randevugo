import Link from "next/link";
import { ReactNode } from "react";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthShell({ eyebrow, title, subtitle, children }: AuthShellProps) {
  return (
    <main className="auth-stage mx-auto grid min-h-[88vh] w-full max-w-7xl items-center gap-8 px-4 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-6">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[linear-gradient(160deg,rgba(2,132,199,0.13),rgba(15,23,42,0.04))] p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute -top-16 right-0 h-56 w-56 rounded-full bg-cyan-300/25 blur-3xl" />
        <div className="absolute -bottom-16 left-0 h-56 w-56 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2 text-[var(--text-2)]">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold text-white">R</span>
            RandevuGo
          </Link>
          <p className="mt-8 inline-block rounded-full border border-sky-200/80 bg-sky-50/75 px-3 py-1 text-xs tracking-[0.14em] text-sky-700">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--text-1)] lg:text-5xl">{title}</h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-[var(--text-2)]">{subtitle}</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Metric label="Uptime" value="99.99%" />
            <Metric label="Tenant Guvenlik" value="Izole" />
            <Metric label="Randevu Motoru" value="Canli" />
          </div>
        </div>
      </section>

      <section className="w-full max-w-lg justify-self-center">{children}</section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 backdrop-blur">
      <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-3)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--text-1)]">{value}</p>
    </div>
  );
}
