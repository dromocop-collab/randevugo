import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const onboardingSchema = z.object({
  name: z.string().trim().min(2, "Isletme adi en az 2 karakter olmalidir."),
  category: z.string().trim().min(1, "Kategori secmelisiniz."),
  phone: z.string().trim().min(10, "Telefon numarasi gecersiz."),
  email: z.string().trim().email("Gecerli bir e-posta girin."),
  address: z.string().trim().min(5, "Adres en az 5 karakter olmalidir."),
  city: z.string().trim().min(2, "Sehir bilgisi zorunludur."),
  district: z.string().trim().min(2, "Ilce bilgisi zorunludur."),
  logoUrl: z.string().trim().url("Logo URL gecersiz.").optional().or(z.literal("")),
  coverUrl: z.string().trim().url("Kapak URL gecersiz.").optional().or(z.literal("")),
  slug: z
    .string()
    .trim()
    .min(3, "Slug en az 3 karakter olmalidir.")
    .regex(slugRegex, "Slug yalnizca kucuk harf, rakam ve tire icerebilir."),
});

export const serviceCreateSchema = z.object({
  name: z.string().trim().min(2, "Hizmet adi en az 2 karakter olmalidir."),
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
});

export function firstErrorMessage(result: z.ZodError): string {
  return result.issues[0]?.message ?? "Form dogrulama hatasi.";
}
