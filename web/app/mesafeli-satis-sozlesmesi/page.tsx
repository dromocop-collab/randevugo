import { ContentPage } from "@/components/marketing/content-page";
import { sellerLines } from "@/lib/legal/seller";
import { createPublicMetadata } from "@/lib/seo/metadata";

export const metadata = createPublicMetadata({
  title: "Mesafeli Satış Sözleşmesi",
  description: "SeninRandevun işletme paketi aboneliğinin web üzerinden satın alınmasına ilişkin mesafeli satış ve abonelik sözleşmesi.",
  pathname: "/mesafeli-satis-sozlesmesi",
  type: "article",
});

export default function Page() {
  return <ContentPage eyebrow="YASAL · 12 EKİM 2026" title="Mesafeli satış sözleşmesi" intro="Bu sözleşme, SeninRandevun işletme paketlerinin seninrandevun.com üzerinden satın alınmasına ilişkin tarafların hak ve yükümlülüklerini düzenler. Ödeme adımına geçmeden önce onaylanır." cta={false} sections={[
    { title: "Taraflar", body: "Satıcı aşağıda bilgileri yer alan SeninRandevun hizmet sağlayıcısıdır. Alıcı, işletme panelinde paket satın alan ve ödeme sırasında bilgileri kullanılan işletme hesabı sahibi veya yetkilisidir.", bullets: sellerLines() },
    { title: "Sözleşmenin konusu", body: "Konu, alıcının seçtiği SeninRandevun paketinin (randevu yönetimi yazılımı) seçilen dönem (1 ay veya 1 yıl) boyunca kullanım hakkının elektronik ortamda sağlanmasıdır. Paket adı, kapsamı, dönem ve KDV dahil toplam bedel ödeme öncesinde abonelik ekranında gösterilir." },
    { title: "Bedel ve ödeme", body: "Bedel, ödeme anında gösterilen KDV dahil Türk lirası tutarıdır ve tek seferde peşin tahsil edilir. Kart ödemeleri lisanslı ödeme kuruluşu PayTR altyapısında 3D Secure ile alınır; kart bilgileri SeninRandevun sunucularında saklanmaz." },
    { title: "İfa ve hizmetin başlaması", body: "Ödeme ödeme kuruluşu tarafından onaylandığında paket, alıcının işletmesine ve varsa bağlı şubelerine otomatik tanımlanır. Devam eden ücretsiz deneme veya aktif dönem varsa yeni dönem onun bitişinden itibaren eklenir; kalan süre kaybolmaz." },
    { title: "Yenileme", body: "Abonelik kendiliğinden yenilenmez ve karttan otomatik çekim yapılmaz. Dönem sonundan önce panel ve bildirimlerle hatırlatma yapılır; alıcı dilerse yeni dönemi yine web işletme paneli üzerinden satın alır." },
    { title: "Cayma hakkı", body: "Hizmet elektronik ortamda anında ifa edilen bir yazılım kullanım hakkıdır ve alıcının onayıyla ödeme anında başlar. Bu nedenle Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesi uyarınca cayma hakkı kapsamı dışındadır; iade halleri İptal ve İade Koşulları sayfasında açıklanmıştır." },
    { title: "Tarafların yükümlülükleri", body: "Satıcı hizmeti makul özen ve güvenlik önlemleriyle sunar; planlı bakım ve mücbir sebeplerden doğan geçici kesintiler saklıdır. Alıcı hesap bilgilerini doğru tutar, hizmeti Kullanım Koşulları'na uygun kullanır ve ödeme bilgilerinin kendisine ait olduğunu beyan eder." },
    { title: "Uyuşmazlık ve yürürlük", body: "Uyuşmazlıklarda Türk hukuku uygulanır; tüketici sıfatı taşıyan alıcılar için Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir. Sözleşme, alıcının ödeme ekranında onay kutusunu işaretleyip ödemeyi tamamlamasıyla kurulur; bir kopyası bu sayfada her zaman erişilebilir." },
  ]} />;
}
