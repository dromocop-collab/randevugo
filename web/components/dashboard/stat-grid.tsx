import { StatCard, StatGrid as UiStatGrid } from "@/components/dashboard/ui";

interface StatItem {
  label: string;
  value: string;
  delta?: string;
}

/** Eski API ile uyumlu basit istatistik ızgarası; yeni sayfalar doğrudan ui/StatGrid + StatCard kullanır. */
export function StatGrid({ items }: { items: StatItem[] }) {
  return (
    <UiStatGrid columns={items.length >= 4 ? 4 : (Math.max(2, items.length) as 2 | 3)}>
      {items.map((item) => <StatCard key={item.label} label={item.label} value={item.value} hint={item.delta} />)}
    </UiStatGrid>
  );
}
