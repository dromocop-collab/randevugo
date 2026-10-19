import { ContentPage } from "@/components/marketing/content-page";
import { getLocale, getT } from "@/i18n/server";
import { SELLER, TERMS_DATE_LABEL } from "@/lib/legal/seller";
import { createPublicMetadata } from "@/lib/seo/metadata";

export async function generateMetadata() {
  const t = await getT();
  return createPublicMetadata({
    title: t("Teslimat ve İfa Koşulları"),
    description: t("SeninRandevun işletme paketlerinin elektronik ortamda teslimi: kargo yoktur, paket ödeme onayıyla anında hesaba tanımlanır."),
    pathname: "/teslimat-ve-ifa",
    type: "article",
    locale: await getLocale(),
  });
}

export default async function Page() {
  const t = await getT();
  const locale = await getLocale();
  const note = locale !== "tr" ? `${t("Bu metnin Türkçe sürümü esastır; çeviri yalnızca bilgi amaçlıdır.")} ` : "";
  return <ContentPage eyebrow={t("YASAL · {date}", { date: t(TERMS_DATE_LABEL) })} title={t("Teslimat ve ifa koşulları")} intro={note + t("SeninRandevun bir yazılım hizmetidir. Satın alınan paketler fiziksel ürün değildir; kargo veya elden teslimat yapılmaz, hizmet elektronik ortamda sunulur.")} cta={false} sections={[
    { title: t("Kargo ve fiziksel teslimat"), body: t("Satışı yapılan işletme paketleri bulut tabanlı yazılım kullanım hakkıdır. Kargo, gönderim veya teslimat ücreti yoktur; adres bilgisi yalnız faturalama amacıyla kullanılır.") },
    { title: t("Teslim zamanı"), body: t("Ödeme, ödeme kuruluşu tarafından onaylandığı anda paket işletme hesabına otomatik olarak tanımlanır; bu işlem genellikle birkaç saniye sürer. Paketin durumu ve bitiş tarihi işletme panelindeki Abonelik ekranında ve mobil uygulamalarda görüntülenir.") },
    { title: t("Teslim yeri"), body: t("Hizmet seninrandevun.com işletme paneli ile SeninRandevun iOS ve Android uygulamaları üzerinden, internet bağlantısı olan her yerden kullanılır. Ek kurulum veya yazılım yüklemesi gerekmez.") },
    { title: t("Kullanım süresi"), body: t("Aylık paket 1 takvim ayı, yıllık paket 1 takvim yılı geçerlidir. Devam eden deneme veya abonelik süresi varsa yeni dönem onun bitiminden itibaren eklenir. Paket kendiliğinden yenilenmez.") },
    { title: t("Teslimat sorunları"), body: t("Ödemeniz alındığı halde paketiniz 24 saat içinde tanımlanmadıysa {email} adresine veya {phone} numarasına ödeme tarihi ve işletme adınızla bildirin. Sorun 3 iş günü içinde giderilemezse ödemeniz İptal ve İade Koşulları uyarınca tamamen iade edilir.", { email: SELLER.email, phone: SELLER.phone }) },
  ]} />;
}
