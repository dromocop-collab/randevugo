"use client";

import { useState } from "react";
import { Check, PackageCheck } from "lucide-react";
import { Badge, Button, EmptyState, SearchField, Sheet } from "@/components/dashboard/ui";
import { ServiceCategoryIcon } from "@/components/ui/service-category-icon";
import type { getCategoryTemplates } from "@/constants/service-category-templates";
import { cx, ws } from "../_workspace/kit";
import styles from "./services.module.css";

type Template = ReturnType<typeof getCategoryTemplates>[number];

export function TemplateLibrarySheet({
  open, sectorLabel, businessTypeLabel, templates, missingCount, busy, onClose, onSubmit,
}: {
  open: boolean;
  sectorLabel: string;
  businessTypeLabel: string;
  /** Eksik hizmeti olan şablon grupları. */
  templates: Template[];
  missingCount: (template: Template) => number;
  busy: boolean;
  onClose: () => void;
  onSubmit: (names: string[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const needle = search.trim().toLocaleLowerCase("tr-TR");
  const visible = templates.filter((template) =>
    `${template.name} ${template.description} ${template.services.map((item) => item.name).join(" ")}`.toLocaleLowerCase("tr-TR").includes(needle),
  );
  const selectedServiceCount = templates.filter((template) => selected.includes(template.name)).reduce((total, template) => total + missingCount(template), 0);
  const allSelected = templates.length > 0 && selected.length === templates.length;

  function toggle(name: string) {
    setSelected((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      dismissible={!busy}
      size="lg"
      title={`${sectorLabel} hizmet kütüphanesi`}
      description={`${businessTypeLabel} için uygun başlıkları seçin; içlerindeki hazır hizmetler eklensin. Fiyat girilene kadar müşterilere gösterilmez.`}
      headerExtra={templates.length ? (
        <div className={styles.libraryBar}>
          <SearchField value={search} onChange={setSearch} placeholder="Başlık veya hizmet ara" />
          <div className={ws.row}>
            <Badge tone="neutral">{templates.length} grup</Badge>
            <Badge tone="accent">{selectedServiceCount} hizmet eklenecek</Badge>
          </div>
        </div>
      ) : undefined}
      footer={<>
        {templates.length ? <Button variant="ghost" onClick={() => setSelected(allSelected ? [] : templates.map((item) => item.name))}>{allSelected ? "Seçimi temizle" : "Tümünü seç"}</Button> : null}
        <Button onClick={onClose} disabled={busy}>Vazgeç</Button>
        <Button variant="primary" icon={PackageCheck} loading={busy} disabled={!selected.length} onClick={() => void onSubmit(selected)}>
          {selected.length ? `${selected.length} başlık · ${selectedServiceCount} hizmet ekle` : "Başlık seçin"}
        </Button>
      </>}
    >
      {templates.length === 0 ? (
        <EmptyState mascot="happy" title="Kütüphane tamamlandı" description={`${businessTypeLabel} için uygun hizmetlerin tamamı işletmenizde.`} />
      ) : visible.length === 0 ? (
        <EmptyState compact mascot="thinking" title="Eşleşen başlık yok" description="Farklı bir kelimeyle aramayı deneyin." />
      ) : (
        <div className={styles.libraryGrid}>
          {visible.map((template) => {
            const isSelected = selected.includes(template.name);
            const count = missingCount(template);
            return (
              <button key={template.name} type="button" onClick={() => toggle(template.name)} aria-pressed={isSelected} className={cx(styles.libraryCard, isSelected && styles.libraryCardOn)} style={{ "--cat-color": template.color } as React.CSSProperties}>
                <span className={styles.libraryHead}>
                  <span className={styles.catIcon} aria-hidden="true"><ServiceCategoryIcon icon={template.icon} name={template.name} size={21} /></span>
                  <span className={styles.libraryTitle}><b>{template.name}</b><small>{count} yeni hizmet</small></span>
                  <i className={styles.libraryCheck} aria-hidden="true">{isSelected ? <Check size={14} strokeWidth={3} /> : null}</i>
                </span>
                {template.description ? <span className={styles.libraryDesc}>{template.description}</span> : null}
                <span className={styles.libraryTags}>
                  {template.services.slice(0, 4).map((item) => <span key={item.name}>{item.name}</span>)}
                  {template.services.length > 4 ? <span className={styles.libraryMore}>+{template.services.length - 4}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}
