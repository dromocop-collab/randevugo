"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, MailCheck, RefreshCw, TriangleAlert, UserPlus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button, Callout, Field, FormGrid, Input, Sheet } from "@/components/dashboard/ui";
import { createStaff, linkStaffAccount, updateStaff } from "@/features/staff/staff-repository";
import { firstErrorMessage, staffCreateSchema } from "@/lib/validation/schemas";
import type { DaySchedule } from "@/types/business";
import type { Service } from "@/types/service";
import type { ServiceCategory } from "@/types/service-category";
import { cx, ws } from "../_workspace/kit";
import { ORDERED_DAYS } from "../_workspace/week-editor";
import { SpecialtyPicker } from "./specialty-picker";
import styles from "./staff.module.css";

const defaultHours: DaySchedule[] = ORDERED_DAYS.map((day) => ({
  day,
  isOpen: day !== 0,
  start: "09:00",
  end: "19:00",
  breakStart: "13:00",
  breakEnd: "14:00",
}));

type LinkResult = { staffId: string; name: string; linked: boolean; email?: string; accountCreated?: boolean; linkError?: string };

export function StaffCreateSheet({ open, businessId, categories, services, nextSortOrder, onClose, onCreated, onOpenStaff }: {
  open: boolean;
  businessId: string;
  categories: ServiceCategory[];
  services: Service[];
  nextSortOrder: number;
  onClose: () => void;
  onCreated: () => Promise<void>;
  onOpenStaff: (staffId: string) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [position, setPosition] = useState("Uzman");
  const [specialtyCategoryIds, setSpecialtyCategoryIds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [result, setResult] = useState<LinkResult | null>(null);

  const fieldErrors: Partial<Record<"name" | "phone" | "email" | "specialtyCategoryIds", string>> = {};
  const parsed = staffCreateSchema.safeParse({ name, phone, email, specialtyCategoryIds });
  if (!parsed.success) parsed.error.issues.forEach((issue) => {
    const key = issue.path[0] as keyof typeof fieldErrors;
    if (!fieldErrors[key]) fieldErrors[key] = turkishMessage(key);
  });
  const show = (key: keyof typeof fieldErrors) => (submitted ? fieldErrors[key] : undefined);
  const matchingServiceCount = services.filter((service) => specialtyCategoryIds.includes(service.category)).length;

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    const validated = staffCreateSchema.safeParse({ name, phone, email, specialtyCategoryIds });
    if (!validated.success) {
      toast.error(firstErrorMessage(validated.error));
      return;
    }
    const { name: safeName, phone: safePhone, email: safeEmail, specialtyCategoryIds: safeCategoryIds } = validated.data;
    const matchingServiceIds = services
      .filter((service) => safeCategoryIds.includes(service.category))
      .map((service) => service.id);

    setBusy(true);
    try {
      const created = await createStaff(businessId, {
        fullName: safeName,
        photoUrl: "",
        phone: safePhone,
        email: safeEmail,
        position: position.trim() || "Uzman",
        specialtyCategoryIds: safeCategoryIds,
        expertiseLevel: "specialist",
        commissionRate: 0,
        serviceOverrides: {},
        permissions: { manageOwnCalendar: true, viewCustomers: false, manageAppointments: false, manageCheckout: false, manageCatalog: false, managePackages: false, manageFinance: false },
        isActive: true,
        serviceIds: matchingServiceIds,
        workingHours: defaultHours,
        leaveDates: [],
        appointmentCapacity: 1,
      });
      // Sunucu sıra numarasını yazmaz; vitrinde en sona eklensin.
      if (created.staffId) await updateStaff(businessId, created.staffId, { sortOrder: nextSortOrder }).catch(() => undefined);
      setResult({ staffId: created.staffId, name: safeName, linked: Boolean(created.linked), email: created.email ?? safeEmail, accountCreated: created.accountCreated, linkError: created.linkError });
      if (created.linked) {
        toast.success(created.accountCreated ? `Çalışan eklendi; ${created.email} adresine davet gönderildi.` : `Çalışan eklendi ve ${created.email} hesabına bağlandı.`);
      } else {
        toast.warning("Çalışan eklendi ancak hesaba bağlanamadı.");
      }
      await onCreated();
    } catch (error) {
      toast.error((error as Error).message || "Çalışan eklenemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function resendInvite() {
    if (!result) return;
    setResending(true);
    try {
      const linked = await linkStaffAccount(businessId, result.staffId, true);
      setResult({ ...result, linked: true, email: linked.email, accountCreated: linked.invited, linkError: undefined });
      toast.success(linked.invited ? `${linked.email} adresine panel daveti gönderildi.` : `${linked.email} çalışan paneline bağlandı.`);
      await onCreated();
    } catch (error) {
      setResult({ ...result, linkError: (error as Error).message || "Hesap yine bağlanamadı." });
      toast.error((error as Error).message || "Çalışan hesabı bağlanamadı.");
    } finally {
      setResending(false);
    }
  }

  if (result) {
    return (
      <Sheet
        open={open}
        onClose={onClose}
        dismissible={!resending}
        size="sm"
        title={result.linked ? "Ekibe katıldı" : "Çalışan eklendi"}
        footer={<>
          <Button variant="ghost" onClick={() => onOpenStaff(result.staffId)}>Profili düzenle</Button>
          <Button variant="primary" onClick={onClose}>Tamam</Button>
        </>}
      >
        <div className={ws.stack}>
          <span className={cx(styles.resultIcon, !result.linked && styles.resultIconWarn)} aria-hidden="true">{result.linked ? <CheckCircle2 size={26} /> : <TriangleAlert size={24} />}</span>
          <div className={styles.resultText}>
            <b>{result.name}</b>
            {result.linked ? (
              <p>{result.accountCreated
                ? <>Şifre belirleme daveti <strong>{result.email}</strong> adresine gönderildi. Çalışan şifresini belirleyince kendi paneline girebilir.</>
                : <><strong>{result.email}</strong> hesabına bağlandı ve bilgilendirme e-postası gönderildi.</>}</p>
            ) : (
              <p>Çalışan listeye eklendi fakat panel hesabına bağlanamadı.</p>
            )}
          </div>
          {result.linked ? (
            <Callout tone="green" icon={MailCheck} title="Çalışan paneli hazır">Yetkileri çalışan profilindeki “Yetkiler” sekmesinden düzenleyebilirsiniz.</Callout>
          ) : (
            <Callout tone="amber" title="Hesap bağlantısı bekliyor" action={<Button size="sm" variant="secondary" icon={RefreshCw} loading={resending} onClick={() => void resendInvite()}>Daveti yeniden gönder</Button>}>
              {result.linkError ?? "Daveti listeden yeniden gönderebilirsiniz."}
            </Callout>
          )}
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      dismissible={!busy}
      placement="side"
      size="lg"
      title="Yeni çalışan"
      description="Temel bilgileri girin; hizmet, saat ve yetkileri ekledikten sonra düzenleyebilirsiniz."
      footer={<>
        {submitted && Object.keys(fieldErrors).length ? <p className={cx(ws.footNote, ws.footNoteError)}>{Object.keys(fieldErrors).length} alan düzeltilmeli</p> : <p className={ws.footNote}><MailCheck size={13} /> Çalışana panel daveti e-postayla gider.</p>}
        <Button variant="ghost" onClick={onClose} disabled={busy}>Vazgeç</Button>
        <Button type="submit" form="staff-create-form" variant="primary" icon={UserPlus} loading={busy}>Ekibe ekle</Button>
      </>}
    >
      <form id="staff-create-form" className={ws.stack} onSubmit={onCreate} noValidate>
        <FormGrid>
          <Field label="Ad soyad" error={show("name")}>
            <Input data-autofocus value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Ali Yılmaz" aria-invalid={Boolean(show("name"))} className={cx(show("name") && styles.invalid)} />
          </Field>
          <Field label="Pozisyon" hint="Müşterilere görünen unvan">
            <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Uzman" />
          </Field>
          <Field label="Telefon" error={show("phone")}>
            <Input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xx xxx xx xx" aria-invalid={Boolean(show("phone"))} className={cx(show("phone") && styles.invalid)} />
          </Field>
          <Field label="E-posta" error={show("email")} hint="Panel daveti bu adrese gönderilir.">
            <Input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(show("email"))} className={cx(show("email") && styles.invalid)} />
          </Field>
        </FormGrid>
        <SpecialtyPicker categories={categories} selectedIds={specialtyCategoryIds} onChange={setSpecialtyCategoryIds} showError={submitted} />
        {specialtyCategoryIds.length ? <p className={styles.hint}><UserRound size={14} aria-hidden="true" /> Seçili branşlardaki {matchingServiceCount} hizmet otomatik atanacak.</p> : null}
      </form>
    </Sheet>
  );
}

function turkishMessage(key: string) {
  if (key === "name") return "Ad soyad en az 2 karakter olmalı.";
  if (key === "phone") return "Geçerli bir telefon numarası girin.";
  if (key === "email") return "Geçerli bir e-posta adresi girin.";
  return "En az bir branş seçin.";
}
