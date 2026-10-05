import { ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatCustomFieldValue, parseCustomFieldValues } from "./booking-fields-domain";
import styles from "./appointment-custom-fields.module.css";

/** İşletme panelinde randevu detayında "Ek bilgiler" bloğu (checkbox → "Evet"). */
export function AppointmentCustomFields({ values, className }: { values: unknown; className?: string }) {
  const rows = parseCustomFieldValues(values);
  if (rows.length === 0) return null;
  return (
    <div className={cn(styles.block, className)}>
      <p className={styles.title}><ClipboardList size={13} aria-hidden /> Ek bilgiler</p>
      <dl className={styles.list}>
        {rows.map((row, index) => (
          <div key={`${row.id}-${index}`} className={styles.row}>
            <dt>{row.label}</dt>
            <dd>{formatCustomFieldValue(row.value, row.type)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
