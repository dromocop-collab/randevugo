import { ContentPage } from "@/components/marketing/content-page";
import { getLocale, getT } from "@/i18n/server";
import { SELLER, TERMS_DATE_LABEL } from "@/lib/legal/seller";
import { createPublicMetadata } from "@/lib/seo/metadata";

export async function generateMetadata() {
  const t = await getT();
  return createPublicMetadata({
    title: t("İptal ve İade Koşulları"),
    description: t("SeninRandevun işletme paketi aboneliğinde iptal, yenileme ve ücret iadesi koşulları."),
    pathname: "/iptal-ve-iade",
    type: "article",
    locale: await getLocale(),
  });
}

export default async function Page() {
  const t = await getT();
  const locale = await getLocale();
  const note = locale !== "tr" ? `${t("Bu metnin Türkçe sürümü esastır; İngilizce çeviri bilgi amaçlıdır.")} ` : "";
  return <ContentPage eyebrow={t("YASAL · {date}", { date: t(TERMS_DATE_LABEL) })} title={t("İptal ve iade koşulları")} intro={note + t("SeninRandevun işletme paketleri web üzerinden dönemlik (aylık veya yıllık) peşin satılır ve kendiliğinden yenilenmez. Bu sayfa, Mesafeli Satış ve Abonelik Sözleşmesi'nin ayrılmaz parçasıdır.")} cta={false} sections={[
    { title: t("Otomatik yenileme yok"), body: t("Satın alınan dönem sonunda paket kendiliğinden sona erer; kartınızdan onayınız olmadan yeni bir çekim yapılmaz. Bu nedenle ayrıca abonelik iptali yapmanız gerekmez.") },
    { title: t("Kullanımı bırakma"), body: t("Paketi dönem içinde kullanmayı dilediğiniz zaman bırakabilirsiniz; erişiminiz ödenen dönem sonuna kadar açık kalır. Kayıtlarınız (randevu, müşteri, hizmet) dönem bitince silinmez; yeniden paket aldığınızda kaldığınız yerden devam edersiniz. Hesabınızın kalıcı olarak silinmesini ayrıca talep edebilirsiniz.") },
    { title: t("Cayma hakkı"), body: t("Hizmet elektronik ortamda anında ifa edildiğinden Mesafeli Sözleşmeler Yönetmeliği m.15/1-(ğ) uyarınca cayma hakkı bulunmamaktadır. Bu durum, aşağıdaki iade hallerini ve tüketicilerin emredici mevzuattan doğan haklarını etkilemez.") },
    { title: t("Tam iade yapılan durumlar"), body: t("Aşağıdaki durumlarda ödenen bedelin tamamı iade edilir:"), bullets: [
      t("Aynı dönem için mükerrer (çift) ödeme alınması — fazla alınan tutar"),
      t("Ödeme alındığı halde paketin teknik bir hata nedeniyle tanımlanamaması ve sorunun bildirimden itibaren 3 iş günü içinde giderilememesi"),
      t("Ödeme sonrası 24 saat içinde paketin hiç kullanılmadan (randevu, çalışan, hizmet kaydı oluşturulmadan) iade talep edilmesi"),
    ] },
    { title: t("Oransal iade yapılan durumlar"), body: t("Aşağıdaki durumlarda dönemin kullanılmayan kısmına isabet eden bedel iade edilir:"), bullets: [
      t("Satıcı kaynaklı bir sebeple hizmetin kesintisiz 72 saatten uzun süre kullanılamaması (kullanılamayan süre oranında)"),
      t("Satıcı'nın hizmeti kalıcı olarak sonlandırması"),
      t("30 günü aşan mücbir sebep nedeniyle sözleşmenin feshedilmesi"),
    ] },
    { title: t("İade edilmeyen durumlar"), body: t("Yukarıdaki haller dışında, başlamış dönemin kullanılmayan kısmı için kısmi iade yapılmaz. Kullanım koşullarına aykırılık nedeniyle hesabın askıya alınması veya sözleşmenin feshedilmesi halinde iade yapılmaz. Kampanya, indirim ve ücretsiz deneme süreleri nakde çevrilmez.") },
    { title: t("Ek SMS kredisi"), body: t("Satın alınan ek SMS kredisi süresizdir, ay sonunda silinmez ve paket süresi dolsa bile hesabınızda kalır. Mükerrer ödeme veya kredinin teknik hata nedeniyle hesaba tanımlanamaması halinde tam iade yapılır; bunun dışında kullanılmış ya da kullanılmamış krediler için iade yapılmaz.") },
    { title: t("Başvuru ve iade süreci"), body: t("İade taleplerinizi işletme panelindeki destek bölümünden, {email} adresinden veya {phone} numaralı telefondan; ödeme tarihi, işletme adı ve talebinizin gerekçesiyle iletebilirsiniz. Talepler en geç 5 iş günü içinde sonuçlandırılır. Uygun bulunan iadeler, onay tarihinden itibaren en geç 14 gün içinde ödemenin yapıldığı karta ödeme kuruluşu üzerinden yapılır; tutarın kartınıza yansıma süresi bankanıza bağlıdır. İadeye konu bedel için gerekli fatura düzeltmeleri mevzuata uygun olarak yapılır.", { email: SELLER.email, phone: SELLER.phone }) },
  ]} />;
}
