import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const onboardingSchema = z.object({
  name: z.string().trim().min(2, "İşletme adı en az 2 karakter olmalıdır."),
  category: z.string().trim().min(1, "Kategori seçmelisiniz."),
  businessType: z.enum(["kadin", "erkek", "unisex"]).optional().or(z.literal("")),
  phone: z.string().trim().refine(
    (value) => /^(?:\+90|0)?5\d{9}$/.test(value.replace(/[\s()-]/g, "")),
    "Geçerli bir Türkiye cep telefonu numarası girin."
  ),
  email: z.string().trim().email("Geçerli bir e-posta girin."),
  address: z.string().trim().min(5, "Adres en az 5 karakter olmalıdır."),
  city: z.string().trim().min(2, "Şehir bilgisi zorunludur."),
  district: z.string().trim().min(2, "İlçe bilgisi zorunludur."),
  logoUrl: z.string().trim().optional().or(z.literal("")),
  coverUrl: z.string().trim().optional().or(z.literal("")),
  slug: z
    .string()
    .trim()
    .min(3, "Profil adresi en az 3 karakter olmalıdır.")
    .regex(slugRegex, "Profil adresi yalnızca küçük harf, rakam ve tire içerebilir."),
});

export const serviceCreateSchema = z.object({
  name: z.string().trim().min(2, "Hizmet adi en az 2 karakter olmalidir."),
  category: z.string().trim().min(1, "Kategori secmelisiniz."),
  description: z.string().trim().optional().or(z.literal("")),
  price: z.coerce.number().positive("Fiyat sifirdan buyuk olmalidir."),
  duration: z.coerce
    .number()
    .int("Sure tam sayi olmalidir.")
    .min(5, "Sure en az 5 dakika olmalidir."),
});

export const staffCreateSchema = z.object({
  name: z.string().trim().min(2, "Ad Soyad en az 2 karakter olmalidir."),
  phone: z.string().trim().min(10, "Telefon numarasi gecersiz."),
  email: z.string().trim().email("Gecerli bir e-posta girin."),
  specialtyCategoryIds: z.array(z.string().min(1)).min(1, "En az bir brans secmelisiniz."),
});

export function firstErrorMessage(result: z.ZodError): string {
  return result.issues[0]?.message ?? "Form doğrulama hatası.";
}
