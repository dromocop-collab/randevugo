"use client";

import { FolderPlus } from "lucide-react";
import { Button, Callout } from "@/components/dashboard/ui";
import { ServiceCategoryIcon } from "@/components/ui/service-category-icon";
import type { ServiceCategory } from "@/types/service-category";
import { ws } from "../_workspace/kit";
import { useT } from "@/i18n/client";
import styles from "./staff.module.css";

export function SpecialtyPicker({
  categories,
  selectedIds,
  onChange,
  showError,
}: {
  categories: ServiceCategory[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  showError?: boolean;
}) {
  const t = useT();
  if (categories.length === 0) {
    return (
      <Callout tone="amber" title={t("Önce bir hizmet kategorisi oluşturun.")} action={<Button size="sm" variant="secondary" icon={FolderPlus} href="/dashboard/hizmetler">{t("Hizmetlere git")}</Button>}>
        {t("Saç, cilt bakımı gibi kategoriler çalışanların branşı olarak kullanılır.")}
      </Callout>
    );
  }

  return (
    <fieldset className={styles.fieldset}>
      <legend>{t("Branşlar")} <small>{t("(birden fazla seçilebilir)")}</small></legend>
      <div className={ws.checkGrid}>
        {categories.map((category) => {
          const selected = selectedIds.includes(category.id);
          return (
            <label key={category.id} className={ws.checkCard}>
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onChange(selected ? selectedIds.filter((id) => id !== category.id) : [...selectedIds, category.id])}
              />
              <span className={styles.specialtyLabel}>
                <ServiceCategoryIcon icon={category.icon} name={category.name} size={18} />
                <b>{category.name}</b>
              </span>
            </label>
          );
        })}
      </div>
      {showError && selectedIds.length === 0 ? <p className={styles.inlineError} role="alert">{t("En az bir branş seçin.")}</p> : null}
    </fieldset>
  );
}
