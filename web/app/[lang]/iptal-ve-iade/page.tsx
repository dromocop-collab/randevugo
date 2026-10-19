import { ContentPage } from "@/components/marketing/content-page";
import { SELLER, TERMS_DATE_LABEL } from "@/lib/legal/seller";
import { createPublicMetadata } from "@/lib/seo/metadata";

export const metadata = createPublicMetadata({
  title: "İptal ve İade Koşulları",
  description: "SeninRandevun işletme paketi aboneliğinde iptal, yenileme ve ücret iadesi koşulları.",
  pathname: "/iptal-ve-iade",
  type: "article",
});

export default function Page() {
  return <ContentPage eyebrow={`YASAL · ${TERMS_DATE_LABEL}`} title="İptal ve iade koşulları" intro="SeninRandevun işletme paketleri web üzerinden dönemlik (aylık veya yıllık) peşin satılır ve kendiliğinden yenilenmez. Bu sayfa, Mesafeli Satış ve Abonelik Sözleşmesi'nin ayrılmaz parçasıdır." cta={false} sections={[
    { title: "Otomatik yenileme yok", body: "Satın alınan dönem sonunda paket kendiliğinden sona erer; kartınızdan onayınız olmadan yeni bir çekim yapılmaz. Bu nedenle ayrıca abonelik iptali yapmanız gerekmez." },
    { title: "Kullanımı bırakma", body: "Paketi dönem içinde kullanmayı dilediğiniz zaman bırakabilirsiniz; erişiminiz ödenen dönem sonuna kadar açık kalır. Kayıtlarınız (randevu, müşteri, hizmet) dönem bitince silinmez; yeniden paket aldığınızda kaldığınız yerden devam edersiniz. Hesabınızın kalıcı olarak silinmesini ayrıca talep edebilirsiniz." },
    { title: "Cayma hakkı", body: "Hizmet elektronik ortamda anında ifa edildiğinden Mesafeli Sözleşmeler Yönetmeliği m.15/1-(ğ) uyarınca cayma hakkı bulunmamaktadır. Bu durum, aşağıdaki iade hallerini ve tüketicilerin emredici mevzuattan doğan haklarını etkilemez." },
    { title: "Tam iade yapılan durumlar", body: "Aşağıdaki durumlarda ödenen bedelin tamamı iade edilir:", bullets: [
      "Aynı dönem için mükerrer (çift) ödeme alınması — fazla alınan tutar",
      "Ödeme alındığı halde paketin teknik bir hata nedeniyle tanımlanamaması ve sorunun bildirimden itibaren 3 iş günü içinde giderilememesi",
      "Ödeme sonrası 24 saat içinde paketin hiç kullanılmadan (randevu, çalışan, hizmet kaydı oluşturulmadan) iade talep edilmesi",
    ] },
    { title: "Oransal iade yapılan durumlar", body: "Aşağıdaki durumlarda dönemin kullanılmayan kısmına isabet eden bedel iade edilir:", bullets: [
      "Satıcı kaynaklı bir sebeple hizmetin kesintisiz 72 saatten uzun süre kullanılamaması (kullanılamayan süre oranında)",
      "Satıcı'nın hizmeti kalıcı olarak sonlandırması",
      "30 günü aşan mücbir sebep nedeniyle sözleşmenin feshedilmesi",
    ] },
    { title: "İade edilmeyen durumlar", body: "Yukarıdaki haller dışında, başlamış dönemin kullanılmayan kısmı için kısmi iade yapılmaz. Kullanım koşullarına aykırılık nedeniyle hesabın askıya alınması veya sözleşmenin feshedilmesi halinde iade yapılmaz. Kampanya, indirim ve ücretsiz deneme süreleri nakde çevrilmez." },
    { title: "Ek SMS kredisi", body: "Satın alınan ek SMS kredisi süresizdir, ay sonunda silinmez ve paket süresi dolsa bile hesabınızda kalır. Mükerrer ödeme veya kredinin teknik hata nedeniyle hesaba tanımlanamaması halinde tam iade yapılır; bunun dışında kullanılmış ya da kullanılmamış krediler için iade yapılmaz." },
    { title: "Başvuru ve iade süreci", body: `İade taleplerinizi işletme panelindeki destek bölümünden, ${SELLER.email} adresinden veya ${SELLER.phone} numaralı telefondan; ödeme tarihi, işletme adı ve talebinizin gerekçesiyle iletebilirsiniz. Talepler en geç 5 iş günü içinde sonuçlandırılır. Uygun bulunan iadeler, onay tarihinden itibaren en geç 14 gün içinde ödemenin yapıldığı karta ödeme kuruluşu üzerinden yapılır; tutarın kartınıza yansıma süresi bankanıza bağlıdır. İadeye konu bedel için gerekli fatura düzeltmeleri mevzuata uygun olarak yapılır.` },
  ]} />;
}
