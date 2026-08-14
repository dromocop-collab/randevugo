import { Card } from "@/components/ui/card";

interface StatItem {
  label: string;
  value: string;
  delta?: string;
}

export function StatGrid({ items }: { items: StatItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => (
        <Card key={item.label} className="relative overflow-hidden">
          <span
            className="absolute left-0 top-0 h-full w-1 rounded-l-2xl"
            style={{
              background:
                index % 2 === 0
                  ? "linear-gradient(180deg, var(--accent), var(--accent-3))"
                  : "linear-gradient(180deg, var(--accent-2), var(--accent))",
            }}
          />
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--text-3)]">{item.label}</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--text-1)]">{item.value}</p>
          {item.delta ? <p className="mt-1 text-xs text-emerald-600">{item.delta}</p> : null}
        </Card>
      ))}
    </div>
  );
}
