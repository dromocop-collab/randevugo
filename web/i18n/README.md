# Çok dilli site (i18n)

Türkçe varsayılan dildir ve adresleri öneksizdir (`/kesfet`). Diğer diller önekli adreste çalışır (`/en/kesfet`).
Sayfalar `app/[lang]/` altındadır; `proxy.ts` öneksiz istekleri içeride `/tr/...` olarak yeniden yazar.

## Kod içinde kullanım

Türkçe metin **anahtardır** (gettext usulü). Sözlükte karşılığı yoksa Türkçe görünür.

| Yer | Kullanım |
|---|---|
| Sunucu bileşeni / `generateMetadata` | `const t = await getT();` — `import { getT, getLocale, getIntlLocale } from "@/i18n/server"` |
| İstemci bileşeni (`"use client"`) | `const t = useT();` — `import { useT, useLocale, useIntlLocale } from "@/i18n/client"` |
| Sabit listeler (menü, seçenek etiketleri) | `label: tk("Takvim")` ile işaretle, gösterirken `t(item.label)` — `import { tk } from "@/i18n/config"` |
| Değişkenli metin | `t("{count} randevu", { count })`, `t("Merhaba {name}", { name })` — parçaları birleştirme, tek cümle yaz |
| Çoğul (sözlükte) | `"{count} randevu": { "one": "{count} appointment", "other": "{count} appointments" }` |
| Tarih / sayı | `"tr-TR"` yazma: istemcide `useIntlLocale()`, sunucuda `await getIntlLocale()`; saf fonksiyonlara `locale` parametresi geç |
| Bağlantı | `import Link from "@/i18n/link"`; yönlendirme `useRouter`/`usePathname` → `@/i18n/navigation`; sunucuda `redirect` → `@/i18n/server-navigation` |
| Tam sayfa geçiş (`window.location`) | `localizeForBrowser("/giris")` — `@/i18n/browser` |
| Sunucu hata mesajı (`error.message`) | Gösterirken `t(message)` — sunucu mesajlarının karşılıkları `messages/en/errors.json` |
| Bilerek Türkçe kalan satır | Satır sonuna ya da üst satıra `// i18n-ignore` |

Meta veriler: `export async function generateMetadata() { const t = await getT(); return createPublicMetadata({ title: t("…"), …, locale: await getLocale() }); }`

Yeni bir sözlük dosyası (`messages/en/xyz.json`) eklersen `i18n/bundles/en.ts` içine de ekle.

## Çevrilmeyenler

Marka adları (SeninRandevun, Senin Randevun, Rovi), il/ilçe/mahalle adları, işletmenin girdiği veriler (işletme, hizmet,
personel adları, açıklamalar), adres yolları (URL), veritabanı değerleri ve enum'lar, analitik anahtarları, CSS sınıfları,
`console` kayıtları, kod yorumları. Para birimi `₺` ve `TL` olduğu gibi kalır.

## Terim sözlüğü (TR → EN)

İngilizce metinler sade, kısa, profesyonel ve **Amerikan yazımıyla** (canceled, color) yazılır; tarih biçimi en-GB'dir.

| Türkçe | English |
|---|---|
| randevu | appointment (fiil: book) |
| randevu al / online randevu | book / online booking |
| işletme | business |
| mağaza / mağaza sayfası | storefront / store page |
| panel / yönetim paneli | dashboard |
| hizmet | service |
| personel / çalışan | staff / staff member |
| müşteri | customer |
| şube | branch |
| bekleme listesi | waitlist |
| canlı sıra | live queue |
| şimdi müsait | available now |
| abonelik | subscription |
| paket (abonelik) | plan |
| hizmet paketi (seans paketi) | service package |
| kasa / ödeme al | checkout |
| kurulum | setup |
| keşfet | explore |
| hesabım | my account |
| yorum / değerlendirme | review |
| takvim | calendar |
| çalışma saatleri | working hours |
| onay bekliyor | pending approval |
| iptal | cancel / canceled |
| gelmedi | no-show |
| otomasyon | automation |
| bildirim | notification |
| doğrulanmış | verified |
| KDV | VAT |
| e-Arşiv fatura | e-Archive invoice |
| KVKK | KVKK (Turkish Personal Data Protection Law) |

## Yeni dil eklemek

1. `i18n/config.ts` → `LOCALES` ve `LOCALE_LABELS` (Intl etiketi, yazım yönü `ltr`/`rtl`).
2. `i18n/messages/<dil>/` klasörünü `en/` ile aynı dosya adlarıyla oluştur; `i18n/bundles/<dil>.ts` paketini yaz
   (`bundles/en.ts` örnek) ve `i18n/messages.ts` ile `i18n/client.tsx` (LOADERS) içinde kaydet.
3. `node i18n/check.mjs` → eksik çeviri kalmayınca bitti. Başka koda dokunmak gerekmez.
