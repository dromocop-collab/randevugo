import { ContentPage } from "@/components/marketing/content-page";
import { getLocale, getT } from "@/i18n/server";
import { createPublicMetadata } from "@/lib/seo/metadata";

export async function generateMetadata() {
  const t = await getT();
  return createPublicMetadata({
    title: t("Gizlilik Politikası"),
    description: t("SeninRandevun web ve mobil hizmetlerinde hangi bilgilerin toplandığını, nasıl kullanıldığını, korunduğunu ve tercihlerinizi nasıl yönetebileceğinizi öğrenin."),
    pathname: "/gizlilik",
    type: "article",
    locale: await getLocale(),
  });
}

export default async function Page() {
  const t = await getT();
  const locale = await getLocale();
  const note = locale !== "tr" ? `${t("Bu metnin Türkçe sürümü esastır; çeviri yalnızca bilgi amaçlıdır.")} ` : "";
  return <ContentPage eyebrow={t("YASAL · 29 EYLÜL 2026")} title={t("Gizlilik politikası")} intro={note + t("SeninRandevun web, iOS ve Android hizmetlerinde bilgilerin nasıl korunduğunu ve tercihlerini nasıl yönetebileceğini sade bir dille açıklar.")} cta={false} sections={[
    { title: t("Kapsam"), body: t("Bu politika ziyaretçiler, randevu alan müşteriler, işletme sahipleri, işletme çalışanları ve destek kanallarını kullanan kişiler için geçerlidir. İşletmelerin kendi müşteri süreçleri için ek bildirimleri bulunabilir.") },
    { title: t("Toplanan bilgiler"), body: t("Hesap ve iletişim bilgileri; işletme, hizmet ve çalışan profilleri; randevu ayrıntıları; destek mesajları; cihaz, oturum, IP ve güvenlik kayıtları işlenebilir. Alanlar amaçla sınırlı tutulur ve gereksiz özel nitelikli veri talep edilmez.") },
    { title: t("Bilgileri nasıl kullanıyoruz?"), body: t("Hesap ve randevu hizmetini sunmak, kimliği ve telefonu doğrulamak, çakışmayı önlemek, bildirim göndermek, dolandırıcılığı engellemek, destek sağlamak ve hukuki yükümlülükleri yerine getirmek için kullanırız. Analitik ve pazarlama teknolojileri yalnızca seçiminizle çalışır.") },
    { title: t("Paylaşım"), body: t("Randevu bilgileri seçtiğiniz işletmeyle; teknik veriler barındırma, bildirim, SMS veya e-posta, hata izleme ve güvenlik sağlayıcılarıyla amaçla sınırlı olarak paylaşılabilir. Kişisel veriler satılmaz. Yetkili mercilere yalnızca geçerli hukuki yükümlülük halinde açıklama yapılır.") },
    { title: t("Saklama ve güvenlik"), body: t("Veriler amaç ve yasal yükümlülük sürdüğü kadar tutulur, ardından silinir, yok edilir veya anonimleştirilir. Şifreli aktarım, erişim kontrolü, rol ayrımı, loglama, yedekleme ve düzenli güvenlik kontrolleri uygulanır.") },
    { title: t("Tercihleriniz"), body: t("Çerez panelinden zorunlu olmayan kategorileri ayrı ayrı açıp kapatabilirsiniz. Bildirim ve hesap tercihlerini ilgili panelden değiştirebilir; KVKK haklarınız için info@seninrandevun.com adresine başvurabilirsiniz.") },
    { title: t("Çocukların gizliliği"), body: t("Hizmet çocuklara yönelik tasarlanmamıştır. Reşit olmayan bir kişiye ilişkin işlemin veli veya yasal temsilci gözetimi olmadan yapıldığını düşünüyorsanız bizimle iletişime geçin.") },
    { title: t("Değişiklikler ve iletişim"), body: t("Esaslı politika değişikliklerini uygulama içinden veya uygun iletişim kanallarından duyururuz. Sorular için info@seninrandevun.com adresine yazabilirsiniz.") },
  ]} />;
}
