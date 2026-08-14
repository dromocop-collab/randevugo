"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FirebaseError } from "firebase/app";
import { toast } from "sonner";
import { createBusinessFromOnboarding } from "@/features/businesses/business-repository";
import { ensureFreePlan } from "@/features/subscriptions/subscription-repository";
import { useAuth } from "@/hooks/use-auth";
import { useBusiness } from "@/hooks/use-business";
import { firstErrorMessage, onboardingSchema } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const categories = [
  { value: "kuafor", label: "Kuafor" },
  { value: "berber", label: "Berber" },
  { value: "guzellik", label: "Guzellik Merkezi" },
  { value: "nail", label: "Nail Studio" },
  { value: "spor", label: "Spor / PT" },
  { value: "danismanlik", label: "Danismanlik" },
  { value: "veteriner", label: "Veteriner" },
  { value: "servis", label: "Servis Isletmesi" },
  { value: "diger", label: "Diger" },
];

const defaultWorkingHours = [1, 2, 3, 4, 5, 6, 0].map((day) => ({
  day,
  isOpen: day !== 0,
  start: "09:00",
  end: "19:00",
  breakStart: "13:00",
  breakEnd: "14:00",
}));

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function mapOnboardingError(error: unknown): string {
  const code = (error as FirebaseError | undefined)?.code;
  if (code === "permission-denied") {
    return "Bu islem icin Firestore yetkisi reddedildi. Kurallar yeni deploy edildiyse sayfayi yenileyip tekrar deneyin.";
  }
  return (error as Error | undefined)?.message ?? "Kurulum sirasinda beklenmeyen bir hata olustu.";
}

export function OnboardingWizard() {
  const { user } = useAuth();
  const { setBusinessId } = useBusiness();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("kuafor");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [firstServiceName, setFirstServiceName] = useState("");
  const [firstStaffName, setFirstStaffName] = useState("");

  const computedSlug = useMemo(() => slugify(name), [name]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;

    const validated = onboardingSchema.safeParse({
      name,
      category,
      phone,
      email,
      address,
      city,
      district,
      logoUrl,
      coverUrl,
      slug: slug || computedSlug,
    });

    if (!validated.success) {
      toast.error(firstErrorMessage(validated.error));
      return;
    }

    setLoading(true);

    try {
      const payload = validated.data;

      const businessId = await createBusinessFromOnboarding({
        ownerUid: user.uid,
        name: payload.name,
        category: payload.category,
        phone: payload.phone,
        email: payload.email,
        address: payload.address,
        city: payload.city,
        district: payload.district,
        logoUrl: payload.logoUrl || undefined,
        coverUrl: payload.coverUrl || undefined,
        slug: payload.slug,
        workingHours: defaultWorkingHours,
      });

      try {
        await ensureFreePlan(businessId);
      } catch {
        toast.message("Plan kaydi olusturulamadi. Varsayilan FREE plan daha sonra otomatik tamamlanacak.");
      }

      setBusinessId(businessId);
      toast.success("Isletmeniz olusturuldu");
      toast.message(`Ilk hizmet: ${firstServiceName || "Daha sonra eklenecek"}`);
      toast.message(`Ilk calisan: ${firstStaffName || "Daha sonra eklenecek"}`);
      router.push("/dashboard");
    } catch (error) {
      toast.error(mapOnboardingError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      title="Isletme kurulumu"
      description="Sadece birkac adimda online randevuya hazir olun."
      className="max-w-3xl"
    >
      <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
        <Input label="Isletme adi" value={name} onChange={(e) => setName(e.target.value)} required />
        <Select label="Kategori" value={category} onChange={(e) => setCategory(e.target.value)} options={categories} />
        <Input label="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        <Input label="E-posta" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Adres" value={address} onChange={(e) => setAddress(e.target.value)} required />
        <Input label="Sehir" value={city} onChange={(e) => setCity(e.target.value)} required />
        <Input label="Ilce" value={district} onChange={(e) => setDistrict(e.target.value)} required />
        <Input label="Logo URL" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
        <Input label="Kapak gorseli URL" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
        <Input
          label="Isletme URL Slug"
          value={slug || computedSlug}
          onChange={(e) => setSlug(e.target.value)}
          required
        />
        <Input label="Ilk hizmet" value={firstServiceName} onChange={(e) => setFirstServiceName(e.target.value)} />
        <Input label="Ilk calisan" value={firstStaffName} onChange={(e) => setFirstStaffName(e.target.value)} />

        <div className="md:col-span-2 flex items-center justify-between">
          <p className="text-sm text-[var(--text-3)]">Adim {step} / 12</p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep((prev) => (prev >= 12 ? 1 : prev + 1))}
            >
              Adim Goster
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Kurulum yapiliyor..." : "Kurulumu Tamamla"}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
