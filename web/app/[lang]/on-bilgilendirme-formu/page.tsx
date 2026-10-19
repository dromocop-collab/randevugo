import { ContentPage } from "@/components/marketing/content-page";
import { SELLER, TERMS_DATE_LABEL, TERMS_VERSION, sellerLines } from "@/lib/legal/seller";
import { createPublicMetadata } from "@/lib/seo/metadata";

export const metadata = createPublicMetadata({
  title: "Ön Bilgilendirme Formu",
  description: "SeninRandevun işletme paketi satın alımı öncesinde Mesafeli Sözleşmeler Yönetmeliği kapsamında sunulan ön bilgilendirme formu.",
  pathname: "/on-bilgilendirme-formu",
  type: "article",
});

export default function Page() {
  return <ContentPage eyebrow={`YASAL · ${TERMS_DATE_LABEL} · SÜRÜM ${TERMS_VERSION}`} title="Ön bilgilendirme formu" intro="Bu form, Mesafeli Sözleşmeler Yönetmeliği'nin 5. maddesi uyarınca, SeninRandevun işletme paketi satın alınmadan önce Alıcı'yı bilgilendirmek amacıyla sunulur. Satın alınan paketin adı, dönemi ve toplam bedeli ödeme ekranında ayrıca gösterilir ve bu formun ayrılmaz parçasıdır." cta={false} sections={[
    { title: "Satıcı bilgileri", body: "Hizmeti sunan satıcıya ait bilgiler:", bullets: sellerLines() },
    {
      title: "Hizmetin temel nitelikleri",
      body: "SeninRandevun; işletmelerin online randevu sayfası, takvim, çalışan, hizmet, müşteri, bildirim ve paket kapsamındaki diğer modülleri kullanmasını sağlayan bulut tabanlı bir randevu yönetim yazılımıdır. Hizmet internet tarayıcısı ve mobil uygulamalar üzerinden kullanılır; fiziksel teslimat yoktur. Paketlerin kapsamı (şube, çalışan ve aylık SMS kotası dahil) Fiyatlar sayfasında ve işletme panelindeki Abonelik ekranında listelenir. Ek SMS kredisi, aylık kota bittiğinde kullanılan ve ay sonunda silinmeyen SMS adedidir; ödeme onayıyla hesaba anında eklenir.",
    },
    {
      title: "Toplam fiyat ve ödeme",
      body: "Seçilen paketin aylık veya yıllık toplam bedeli, tüm vergiler (KDV) dahil olarak Türk lirası cinsinden ödeme ekranında gösterilir. Ek kurulum, aktivasyon, kargo veya benzeri ücret yoktur. Ödeme banka/kredi kartıyla, lisanslı ödeme kuruluşu PayTR altyapısında 3D Secure ile tek seferde peşin alınır; taksit uygulanmaz.",
    },
    {
      title: "İfa şekli ve süresi",
      body: "Ödeme onaylandığında paket işletme hesabına otomatik tanımlanır ve hizmet derhal başlar. Devam eden deneme veya abonelik süresi varsa yeni dönem onun bitiminden itibaren eklenir. Abonelik dönem sonunda kendiliğinden sona erer; otomatik yenileme ve otomatik kart çekimi yapılmaz.",
    },
    {
      title: "Cayma hakkı",
      body: "Hizmet elektronik ortamda anında ifa edildiğinden, Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesinin birinci fıkrasının (ğ) bendi uyarınca tüketici Alıcı'lar için cayma hakkı bulunmamaktadır. Alıcı, ödeme adımında hizmetin derhal başlamasını talep ettiğini ve bu nedenle cayma hakkını kullanamayacağını onaylar. Mükerrer ödeme, teknik hata ve satıcı kaynaklı kesinti gibi iade halleri İptal ve İade Koşulları sayfasında düzenlenmiştir.",
    },
    {
      title: "Şikâyet ve başvuru yolları",
      body: `Talep ve şikâyetler için ${SELLER.email} adresine, ${SELLER.phone} numaralı telefona veya işletme panelindeki destek bölümüne başvurulabilir. Tüketici Alıcı'lar, Ticaret Bakanlığı'nca her yıl ilan edilen parasal sınırlar dahilinde Tüketici Hakem Heyetlerine, bu sınırları aşan uyuşmazlıklarda Tüketici Mahkemelerine başvurabilir.`,
    },
    {
      title: "Diğer hususlar",
      body: "Alıcı, bu formu ve Mesafeli Satış ve Abonelik Sözleşmesi'ni okuyup anladığını, ödeme ekranındaki onay kutusunu işaretleyerek elektronik ortamda teyit eder. Bu formun ve sözleşmenin onaylanan sürümü, onay zamanıyla birlikte ödeme kaydında saklanır ve talep halinde Alıcı'ya iletilir.",
    },
  ]} />;
}
