import { ContentPage } from "@/components/marketing/content-page";
import { getLocale, getT } from "@/i18n/server";
import { createPublicMetadata } from "@/lib/seo/metadata";
// Uygulama mağazaları (App Store, Google Play) ve Meta, hesap/veri silme yolunu açıkça anlatan herkese açık bir sayfa ister.
// Silme mantığı: functions/src/index.ts › deleteMyAccount.

export async function generateMetadata() {
  const t = await getT();
  return createPublicMetadata({
    title: t("Hesap ve Veri Silme"),
    description: t("SeninRandevun hesabınızı ve verilerinizi web sitesinden, iPhone veya Android uygulamasından nasıl kalıcı olarak silebileceğiniz; hangi verilerin silindiği ve hangilerinin yasal olarak saklandığı."),
    pathname: "/hesap-silme",
    type: "article",
    locale: await getLocale(),
  });
}

export default async function Page() {
  const t = await getT();
  const locale = await getLocale();
  const note = locale !== "tr" ? `${t("Bu metnin Türkçe sürümü esastır; İngilizce çeviri bilgi amaçlıdır.")} ` : "";
  return <ContentPage eyebrow={t("YASAL · 17 EKİM 2026")} title={t("Hesap ve veri silme")} intro={note + t("SeninRandevun hesabınızı ve hesabınıza bağlı verileri istediğiniz zaman, kimseye sormadan kalıcı olarak silebilirsiniz. Bu sayfa silme adımlarını, nelerin silindiğini ve yasal zorunluluk nedeniyle nelerin bir süre saklandığını açıklar.")} cta={false} sections={[
    { title: t("Web sitesinden silme"), body: t("Silme işlemi birkaç saniye sürer ve geri alınamaz."), bullets: [
      t("seninrandevun.com adresinde hesabınıza giriş yapın."),
      t("Sağ üstten Hesabım sayfasını açın."),
      t("En altta “Hesabımı ve verilerimi sil” seçeneğine dokunun."),
      t("Onay için hesabınıza kayıtlı e-posta adresini eksiksiz yazın ve silmeyi onaylayın."),
    ] },
    { title: t("iPhone ve Android uygulamasından silme"), body: t("Senin Randevun mobil uygulamasında da aynı işlem birkaç adımda yapılır."), bullets: [
      t("Uygulamada Hesabım (profil) sekmesini açın."),
      t("iPhone: Ayarlar → “Hesabımı kalıcı olarak sil”. Android: “Hesabımı Sil”."),
      t("Kayıtlı e-posta adresinizi yazarak onaylayın. Silme tamamlanınca oturumunuz kapanır."),
    ] },
    { title: t("Giriş yapamıyorsanız"), body: t("Hesabınıza erişemiyorsanız silme talebinizi kayıtlı e-posta adresinizden info@seninrandevun.com adresine “Hesap silme talebi” konusuyla gönderin. Kimliğinizi doğruladıktan sonra hesabınızı en geç 30 gün içinde sileriz ve size bilgi veririz."), bullets: [
      t("Talebinizde hesabınıza kayıtlı e-posta adresini veya telefon numarasını belirtin."),
      t("Güvenliğiniz için başkası adına yapılan talepleri işleme almayız."),
    ] },
    { title: t("Silinen veriler"), body: t("Silme işlemiyle hesabınız ve hesabınıza bağlı aşağıdaki veriler anında ve kalıcı olarak silinir."), bullets: [
      t("Giriş bilgileri, profil, telefon ve e-posta kaydı"),
      t("Müşteri olarak aldığınız randevular, randevu bağlantıları ve notlar"),
      t("Yazdığınız yorumlar (işletme puanı buna göre yeniden hesaplanır)"),
      t("Favoriler, bildirim izinleri ve cihaz kayıtları"),
      t("Yüklediğiniz fotoğraflar ve dosyalar"),
      t("İşletme sahibiyseniz: sahibi olduğunuz işletmeler, şubeler, hizmetler, çalışanlar, müşteri listeleri, randevular ve görselleri"),
    ] },
    { title: t("Yasal olarak saklanan kayıtlar"), body: t("Bazı kayıtlar silme talebinden sonra da kanunda öngörülen süre boyunca saklanmak zorundadır. Bu kayıtlar başka hiçbir amaçla kullanılmaz ve süre dolunca silinir."), bullets: [
      t("Abonelik ödeme ve fatura kayıtları: Vergi Usul Kanunu ve Türk Ticaret Kanunu gereği 10 yıl"),
      t("Güvenlik ve erişim kayıtları (IP, zaman damgası): ilgili mevzuatın öngördüğü süre boyunca"),
      t("Devam eden bir uyuşmazlık veya resmi talep varsa ilgili kayıtlar sonuçlanana kadar"),
    ] },
    { title: t("İşletme sahipleri ve çalışanlar"), body: t("İşletme sahibi hesabını sildiğinde, sahibi olduğu işletmenin mağaza sayfası yayından kalkar ve gelecek randevular dahil işletmeye ait tüm veriler silinir. Bu nedenle silmeden önce müşterilerinizi bilgilendirmeniz önerilir. Çalışan hesabı silindiğinde yalnız o kişinin hesabı silinir; işletmenin kayıtları işletmede kalır.") },
    { title: t("İşletmeye verdiğiniz bilgiler"), body: t("Bir işletmeden randevu aldığınızda adınız ve telefonunuz o işletmenin müşteri kaydına da eklenmiş olabilir. İşletme bu kayıt için ayrıca veri sorumlusudur. Hesabınızı silmeniz SeninRandevun'daki kaydınızı siler; yalnızca işletmenin kendi müşteri listesinden de silinmek istiyorsanız işletmeye doğrudan başvurabilir veya info@seninrandevun.com adresinden bize yazabilirsiniz, işletmeye iletelim.") },
    { title: t("Hesabı silmeden sadece bildirimleri kapatmak"), body: t("Hesabınızı silmek istemiyor, yalnızca mesaj almak istemiyorsanız: uygulamada bildirim izinlerini kapatabilir, WhatsApp'ta işletme sohbetini engelleyebilir veya randevu aldığınız işletmeden SMS bildirimlerini kapatmasını isteyebilirsiniz. Ayrıntılar için KVKK Aydınlatma Metni ve Gizlilik Politikası'na bakabilirsiniz.") },
  ]} />;
}
