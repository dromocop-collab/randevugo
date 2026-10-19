import { ContentPage } from "@/components/marketing/content-page";
import { getLocale, getT } from "@/i18n/server";
import { createPublicMetadata } from "@/lib/seo/metadata";

export async function generateMetadata() {
  const t = await getT();
  return createPublicMetadata({
    title: t("Kullanım Koşulları"),
    description: t("SeninRandevun hesap, işletme profili, randevu, abonelik, içerik doğruluğu ve platform kullanımına ilişkin güncel hizmet koşulları."),
    pathname: "/kullanim-kosullari",
    type: "article",
    locale: await getLocale(),
  });
}

export default async function Page() {
  const t = await getT();
  const locale = await getLocale();
  const note = locale !== "tr" ? `${t("Bu metnin Türkçe sürümü esastır; çeviri yalnızca bilgi amaçlıdır.")} ` : "";
  return <ContentPage eyebrow={t("YASAL · 29 EYLÜL 2026")} title={t("Kullanım koşulları")} intro={note + t("SeninRandevun'u kullanarak hesap güvenliği, içerik doğruluğu, randevu işlemleri ve yasal kullanıma ilişkin bu koşulları kabul edersiniz.")} cta={false} sections={[
    { title: t("Hizmetin kapsamı"), body: t("SeninRandevun; işletmelerin profil, hizmet, çalışan, müsaitlik ve randevu süreçlerini yönetmesini; müşterilerin uygun işletme ve saatleri bulup randevu oluşturmasını sağlayan bir teknoloji platformudur. İşletmenin sunduğu asıl hizmetin tarafı veya sağlayıcısı değildir.") },
    { title: t("Hesap ve güvenlik"), body: t("Kayıt bilgilerinin doğru ve güncel tutulması, giriş ve doğrulama bilgilerinin korunması ve yetkisiz erişimin derhal bildirilmesi kullanıcı sorumluluğundadır. Şüpheli, kötüye kullanıma açık veya mevzuata aykırı hesaplar güvenlik incelemesi süresince sınırlandırılabilir.") },
    { title: t("İşletme içeriği"), body: t("İşletme adı, yetki, hizmet, fiyat, süre, çalışan, çalışma saati, adres, görsel ve diğer yayınların doğru, güncel, hukuka ve üçüncü taraf haklarına uygun olması işletmenin sorumluluğundadır. Eksik, yanıltıcı, demo veya uygunsuz içerik yayımdan kaldırılabilir.") },
    { title: t("Randevu, iptal ve değişiklik"), body: t("Randevu işletmenin ilan ettiği müsaitlik ve kurallara göre kurulur. İptal, değişiklik, gecikme, hizmetin kapsamı, fiyatı ve iade gibi hususlar ilgili işletmenin yayımladığı koşullara tabidir. Kullanıcı randevu bilgilerini kontrol etmek ve değişiklikleri zamanında bildirmekle yükümlüdür.") },
    { title: t("Kabul edilebilir kullanım"), body: t("Hizmet yasa dışı, yanıltıcı, zararlı, taciz edici, otomatik kötüye kullanım oluşturan veya üçüncü taraf haklarını ihlal eden amaçlarla kullanılamaz. Güvenliği aşma, sahte randevu, izinsiz veri toplama, tersine mühendislik ve hizmeti aksatmaya yönelik işlemler yasaktır.") },
    { title: t("Ücretsiz dönem ve abonelik"), body: t("Lansman kampanyası kapsamında açılan işletme hesapları kayıt tarihinden itibaren ilk ay ücretsizdir. Ücretsiz dönemin sonunda işletme özellikleri güncel plan ve fiyatlandırmaya göre sınırlandırılabilir. Ücretli paketler yalnız web işletme panelinden, dönemlik ve otomatik yenilemesiz satılır; satış, yenileme ve iade koşulları Mesafeli Satış Sözleşmesi ile İptal ve İade Koşulları sayfalarında yer alır.") },
    { title: t("Fikri mülkiyet"), body: t("Platform yazılımı, arayüzü, tasarımı, markası ve özgün içerikleri üzerindeki haklar saklıdır. Kullanıcı içeriklerinin mülkiyeti kullanıcıda kalır; platforma yalnızca hizmeti sunmak ve içeriği kullanıcı talimatına göre göstermek için gerekli sınırlı kullanım yetkisi verilir.") },
    { title: t("Süreklilik ve sorumluluk"), body: t("Güvenli ve kesintisiz hizmet için makul teknik önlemler alınır; planlı bakım, üçüncü taraf servisleri, internet kesintileri veya mücbir sebepler nedeniyle geçici erişim sorunları yaşanabilir. Emredici hukuk hükümleri saklı kalmak üzere dolaylı zararlar ve işletmenin sunduğu asıl hizmetten doğan uyuşmazlıklar işletme ile müşteri arasındadır.") },
    { title: t("Değişiklik, fesih ve iletişim"), body: t("Koşullar hizmet veya mevzuat değişikliklerine göre güncellenebilir; esaslı değişiklikler uygun kanallardan duyurulur. Kullanıcı hesabını kapatabilir; yükümlülük ihlalinde erişim askıya alınabilir veya sonlandırılabilir. Sorular için info@seninrandevun.com adresine ulaşabilirsiniz.") },
  ]} />;
}
