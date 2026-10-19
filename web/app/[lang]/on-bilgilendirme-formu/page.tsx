import { ContentPage } from "@/components/marketing/content-page";
import { getLocale, getT } from "@/i18n/server";
import { SELLER, TERMS_DATE_LABEL, TERMS_VERSION, sellerLines } from "@/lib/legal/seller";
import { createPublicMetadata } from "@/lib/seo/metadata";

export async function generateMetadata() {
  const t = await getT();
  return createPublicMetadata({
    title: t("Ön Bilgilendirme Formu"),
    description: t("SeninRandevun işletme paketi satın alımı öncesinde Mesafeli Sözleşmeler Yönetmeliği kapsamında sunulan ön bilgilendirme formu."),
    pathname: "/on-bilgilendirme-formu",
    type: "article",
    locale: await getLocale(),
  });
}

export default async function Page() {
  const t = await getT();
  const locale = await getLocale();
  const note = locale !== "tr" ? `${t("Bu metnin Türkçe sürümü esastır; çeviri yalnızca bilgi amaçlıdır.")} ` : "";
  return <ContentPage eyebrow={t("YASAL · {date} · SÜRÜM {version}", { date: t(TERMS_DATE_LABEL), version: TERMS_VERSION })} title={t("Ön bilgilendirme formu")} intro={note + t("Bu form, Mesafeli Sözleşmeler Yönetmeliği'nin 5. maddesi uyarınca, SeninRandevun işletme paketi satın alınmadan önce Alıcı'yı bilgilendirmek amacıyla sunulur. Satın alınan paketin adı, dönemi ve toplam bedeli ödeme ekranında ayrıca gösterilir ve bu formun ayrılmaz parçasıdır.")} cta={false} sections={[
    { title: t("Satıcı bilgileri"), body: t("Hizmeti sunan satıcıya ait bilgiler:"), bullets: sellerLines(t) },
    {
      title: t("Hizmetin temel nitelikleri"),
      body: t("SeninRandevun; işletmelerin online randevu sayfası, takvim, çalışan, hizmet, müşteri, bildirim ve paket kapsamındaki diğer modülleri kullanmasını sağlayan bulut tabanlı bir randevu yönetim yazılımıdır. Hizmet internet tarayıcısı ve mobil uygulamalar üzerinden kullanılır; fiziksel teslimat yoktur. Paketlerin kapsamı (şube, çalışan ve aylık SMS kotası dahil) Fiyatlar sayfasında ve işletme panelindeki Abonelik ekranında listelenir. Ek SMS kredisi, aylık kota bittiğinde kullanılan ve ay sonunda silinmeyen SMS adedidir; ödeme onayıyla hesaba anında eklenir."),
    },
    {
      title: t("Toplam fiyat ve ödeme"),
      body: t("Seçilen paketin aylık veya yıllık toplam bedeli, tüm vergiler (KDV) dahil olarak Türk lirası cinsinden ödeme ekranında gösterilir. Ek kurulum, aktivasyon, kargo veya benzeri ücret yoktur. Ödeme banka/kredi kartıyla, lisanslı ödeme kuruluşu PayTR altyapısında 3D Secure ile tek seferde peşin alınır; taksit uygulanmaz."),
    },
    {
      title: t("İfa şekli ve süresi"),
      body: t("Ödeme onaylandığında paket işletme hesabına otomatik tanımlanır ve hizmet derhal başlar. Devam eden deneme veya abonelik süresi varsa yeni dönem onun bitiminden itibaren eklenir. Abonelik dönem sonunda kendiliğinden sona erer; otomatik yenileme ve otomatik kart çekimi yapılmaz."),
    },
    {
      title: t("Cayma hakkı"),
      body: t("Hizmet elektronik ortamda anında ifa edildiğinden, Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesinin birinci fıkrasının (ğ) bendi uyarınca tüketici Alıcı'lar için cayma hakkı bulunmamaktadır. Alıcı, ödeme adımında hizmetin derhal başlamasını talep ettiğini ve bu nedenle cayma hakkını kullanamayacağını onaylar. Mükerrer ödeme, teknik hata ve satıcı kaynaklı kesinti gibi iade halleri İptal ve İade Koşulları sayfasında düzenlenmiştir."),
    },
    {
      title: t("Şikâyet ve başvuru yolları"),
      body: t("Talep ve şikâyetler için {email} adresine, {phone} numaralı telefona veya işletme panelindeki destek bölümüne başvurulabilir. Tüketici Alıcı'lar, Ticaret Bakanlığı'nca her yıl ilan edilen parasal sınırlar dahilinde Tüketici Hakem Heyetlerine, bu sınırları aşan uyuşmazlıklarda Tüketici Mahkemelerine başvurabilir.", { email: SELLER.email, phone: SELLER.phone }),
    },
    {
      title: t("Diğer hususlar"),
      body: t("Alıcı, bu formu ve Mesafeli Satış ve Abonelik Sözleşmesi'ni okuyup anladığını, ödeme ekranındaki onay kutusunu işaretleyerek elektronik ortamda teyit eder. Bu formun ve sözleşmenin onaylanan sürümü, onay zamanıyla birlikte ödeme kaydında saklanır ve talep halinde Alıcı'ya iletilir."),
    },
  ]} />;
}
