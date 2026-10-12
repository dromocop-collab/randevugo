import { ContentPage } from "@/components/marketing/content-page";
import { SELLER, TERMS_DATE_LABEL } from "@/lib/legal/seller";
import { createPublicMetadata } from "@/lib/seo/metadata";

export const metadata = createPublicMetadata({
  title: "Teslimat ve İfa Koşulları",
  description: "SeninRandevun işletme paketlerinin elektronik ortamda teslimi: kargo yoktur, paket ödeme onayıyla anında hesaba tanımlanır.",
  pathname: "/teslimat-ve-ifa",
  type: "article",
});

export default function Page() {
  return <ContentPage eyebrow={`YASAL · ${TERMS_DATE_LABEL}`} title="Teslimat ve ifa koşulları" intro="SeninRandevun bir yazılım hizmetidir. Satın alınan paketler fiziksel ürün değildir; kargo veya elden teslimat yapılmaz, hizmet elektronik ortamda sunulur." cta={false} sections={[
    { title: "Kargo ve fiziksel teslimat", body: "Satışı yapılan işletme paketleri bulut tabanlı yazılım kullanım hakkıdır. Kargo, gönderim veya teslimat ücreti yoktur; adres bilgisi yalnız faturalama amacıyla kullanılır." },
    { title: "Teslim zamanı", body: "Ödeme, ödeme kuruluşu tarafından onaylandığı anda paket işletme hesabına otomatik olarak tanımlanır; bu işlem genellikle birkaç saniye sürer. Paketin durumu ve bitiş tarihi işletme panelindeki Abonelik ekranında ve mobil uygulamalarda görüntülenir." },
    { title: "Teslim yeri", body: "Hizmet seninrandevun.com işletme paneli ile SeninRandevun iOS ve Android uygulamaları üzerinden, internet bağlantısı olan her yerden kullanılır. Ek kurulum veya yazılım yüklemesi gerekmez." },
    { title: "Kullanım süresi", body: "Aylık paket 1 takvim ayı, yıllık paket 1 takvim yılı geçerlidir. Devam eden deneme veya abonelik süresi varsa yeni dönem onun bitiminden itibaren eklenir. Paket kendiliğinden yenilenmez." },
    { title: "Teslimat sorunları", body: `Ödemeniz alındığı halde paketiniz 24 saat içinde tanımlanmadıysa ${SELLER.email} adresine veya ${SELLER.phone} numarasına ödeme tarihi ve işletme adınızla bildirin. Sorun 3 iş günü içinde giderilemezse ödemeniz İptal ve İade Koşulları uyarınca tamamen iade edilir.` },
  ]} />;
}
