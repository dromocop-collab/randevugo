import { ReactNode } from "react";

export function LoadingState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-10 text-center">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-sky-500" />
      <h2 className="mt-4 text-lg font-semibold text-[var(--text-1)]">{title}</h2>
      {description ? <p className="mt-1 text-sm text-[var(--text-3)]">{description}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-10 text-center">
      <h3 className="text-lg font-semibold text-[var(--text-1)]">{title}</h3>
      <p className="mt-2 text-sm text-[var(--text-3)]">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
      <h3 className="text-lg font-semibold text-rose-700">{title}</h3>
      <p className="mt-2 text-sm text-rose-600">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className = "h-6 w-full" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`} />;
}
