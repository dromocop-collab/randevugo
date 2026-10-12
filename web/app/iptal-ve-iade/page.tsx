import { ContentPage } from "@/components/marketing/content-page";
import { SELLER } from "@/lib/legal/seller";
import { createPublicMetadata } from "@/lib/seo/metadata";

export const metadata = createPublicMetadata({
  title: "İptal ve İade Koşulları",
  description: "SeninRandevun işletme paketi aboneliğinde iptal, yenileme ve ücret iadesi koşulları.",
  pathname: "/iptal-ve-iade",
  type: "article",
});

export default function Page() {
  return <ContentPage eyebrow="YASAL · 12 EKİM 2026" title="İptal ve iade koşulları" intro="SeninRandevun işletme paketleri web üzerinden dönemlik (aylık veya yıllık) peşin satılır ve kendiliğinden yenilenmez." cta={false} sections={[
    { title: "Otomatik yenileme yok", body: "Satın alınan dönem sonunda paket kendiliğinden sona erer; kartınızdan izniniz olmadan yeni bir çekim yapılmaz. Bu nedenle ayrıca abonelik iptali gerekmez." },
    { title: "Kullanımı bırakma", body: "Paketi dönem içinde kullanmayı bırakabilirsiniz; erişim ödenen dönem sonuna kadar açık kalır. Kayıtlarınız (randevu, müşteri, hizmet) dönem bitince silinmez, yeniden paket alındığında kaldığınız yerden devam edersiniz." },
    { title: "Ücret iadesi yapılan durumlar", body: "Aşağıdaki durumlarda ödeme kısmen veya tamamen iade edilir:", bullets: [
      "Aynı dönem için mükerrer (çift) ödeme alınması",
      "Ödeme alındığı halde paketin teknik bir hata nedeniyle tanımlanamaması",
      "Hizmetin satıcıdan kaynaklı sebeple ödenen dönemin önemli bir bölümünde kullanılamaması (kullanılamayan süre oranında)",
    ] },
    { title: "İade edilmeyen durumlar", body: "Hizmet ödeme anında ifa edildiği için, yukarıdaki haller dışında başlamış dönemin kullanılmayan kısmı için kısmi iade yapılmaz. Kampanya ve ücretsiz deneme süreleri nakde çevrilmez." },
    { title: "Başvuru ve süre", body: `İade taleplerinizi işletme panelindeki destek bölümünden veya ${SELLER.email} adresinden, ödeme tarihi ve işletme adıyla iletebilirsiniz. Uygun bulunan iadeler en geç 14 gün içinde ödemenin yapıldığı karta, ödeme kuruluşu üzerinden yapılır; kartınıza yansıma süresi bankanıza bağlıdır.` },
  ]} />;
}
