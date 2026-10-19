import { z } from "zod";
import { tk } from "@/i18n/config";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const onboardingSchema = z.object({
  name: z.string().trim().min(2, tk("İşletme adı en az 2 karakter olmalıdır.")),
  category: z.string().trim().min(1, tk("Kategori seçmelisiniz.")),
  businessType: z.enum(["kadin", "erkek", "unisex"]).optional().or(z.literal("")),
  phone: z.string().trim().refine(
    (value) => /^(?:\+90|0)?5\d{9}$/.test(value.replace(/[\s()-]/g, "")),
    tk("Geçerli bir Türkiye cep telefonu numarası girin.")
  ),
  email: z.string().trim().email(tk("Geçerli bir e-posta girin.")),
  address: z.string().trim().min(5, tk("Adres en az 5 karakter olmalıdır.")),
  city: z.string().trim().min(2, tk("Şehir bilgisi zorunludur.")),
  district: z.string().trim().min(2, tk("İlçe bilgisi zorunludur.")),
  logoUrl: z.string().trim().optional().or(z.literal("")),
  coverUrl: z.string().trim().optional().or(z.literal("")),
  slug: z
    .string()
    .trim()
    .min(3, tk("Profil adresi en az 3 karakter olmalıdır."))
    .regex(slugRegex, tk("Profil adresi yalnızca küçük harf, rakam ve tire içerebilir.")),
});

export const serviceCreateSchema = z.object({
  name: z.string().trim().min(2, tk("Hizmet adi en az 2 karakter olmalidir.")),
  category: z.string().trim().min(1, tk("Kategori secmelisiniz.")),
  description: z.string().trim().optional().or(z.literal("")),
  price: z.coerce.number().positive(tk("Fiyat sifirdan buyuk olmalidir.")),
  duration: z.coerce
    .number()
    .int(tk("Sure tam sayi olmalidir."))
    .min(5, tk("Sure en az 5 dakika olmalidir.")),
});

export const staffCreateSchema = z.object({
  name: z.string().trim().min(2, tk("Ad Soyad en az 2 karakter olmalidir.")),
  phone: z.string().trim().min(10, tk("Telefon numarasi gecersiz.")),
  email: z.string().trim().email(tk("Gecerli bir e-posta girin.")),
  specialtyCategoryIds: z.array(z.string().min(1)).min(1, tk("En az bir brans secmelisiniz.")),
});

/** Türkçe anahtar döner (tk ile işaretli); gösterirken t(firstErrorMessage(error)). */
export function firstErrorMessage(result: z.ZodError): string {
  return result.issues[0]?.message ?? tk("Form doğrulama hatası.");
}
