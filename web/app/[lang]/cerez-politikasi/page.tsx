import { ContentPage } from "@/components/marketing/content-page";
import { getLocale, getT } from "@/i18n/server";
import { createPublicMetadata } from "@/lib/seo/metadata";

export async function generateMetadata() {
  const t = await getT();
  return createPublicMetadata({
    title: t("Çerez Politikası"),
    description: t("SeninRandevun zorunlu, analitik ve pazarlama çerezlerinin kullanım amaçlarını ve çerez tercihlerinizi nasıl yönetebileceğinizi öğrenin."),
    pathname: "/cerez-politikasi",
    type: "article",
    locale: await getLocale(),
  });
}

export default async function Page() {
  const t = await getT();
  const locale = await getLocale();
  const note = locale !== "tr" ? `${t("Bu metnin Türkçe sürümü esastır; çeviri yalnızca bilgi amaçlıdır.")} ` : "";
  return <ContentPage eyebrow={t("YASAL · 29 EYLÜL 2026")} title={t("Çerez politikası")} intro={note + t("Hangi çerezlerin neden kullanıldığını, ne zaman çalıştığını ve tercihini nasıl değiştirebileceğini açıklar. Zorunlu olmayan çerezler varsayılan olarak kapalıdır.")} cta={false} sections={[
    { title: t("Çerez nedir?"), body: t("Çerezler ve benzer yerel depolama teknolojileri, tarayıcının hizmeti güvenli ve tutarlı biçimde çalıştırması veya izin verdiğiniz ölçüm ve pazarlama işlemlerini yapması için cihazda küçük bilgiler saklar.") },
    { title: t("Zorunlu çerezler"), body: t("Güvenli oturum, kimlik doğrulama, dolandırıcılığın önlenmesi, dil veya tema, çerez tercihi ve temel form işlevleri için gereklidir. Bu kategori hizmetin çalışması için kullanılır ve tercih panelinden kapatılamaz.") },
    { title: t("Analitik çerezler"), body: t("İzin verirseniz sayfa görüntüleme, etkileşim, cihaz türü ve performans gibi toplu verileri ölçer. Google Analytics ve Google Tag Manager yalnızca analitik tercihi açıkken yüklenir. Bu kategoriyi reddetmek temel hizmeti etkilemez.") },
    { title: t("Pazarlama çerezleri"), body: t("İzin verirseniz kampanya performansını ölçmek ve ilgili içerik sunmak için kullanılabilir. Meta Pixel gibi pazarlama araçları yalnızca pazarlama tercihi açıkken yüklenir. Bu kategoriyi reddetmek randevu ve hesap işlevlerini etkilemez.") },
    { title: t("Tercih ve kayıt"), body: t("İlk ziyarette Tümünü reddet, Tercihleri yönet ve Tümünü kabul et seçenekleri eşit biçimde sunulur. Seçimin kategori, sürüm ve tarih bilgisiyle cihazda saklanır; onay vermemek hizmete erişimi engellemez.") },
    { title: t("Tercihi değiştirme"), body: t("Sayfa altındaki Çerez tercihleri bağlantısıyla paneli yeniden açabilir, analitik ve pazarlama kategorilerini bağımsız olarak değiştirebilirsiniz. Tarayıcı ayarlarıyla çerezleri silebilir veya engelleyebilirsiniz; zorunlu teknolojilerin engellenmesi bazı işlevleri bozabilir.") },
    { title: t("Üçüncü taraflar ve süre"), body: t("Etkinleştirdiğiniz araçların çerez isimleri ve saklama süreleri sağlayıcının yapılandırmasına göre değişebilir. Yapılandırma değiştiğinde bu politika ve tercih sürümü gözden geçirilir. Sağlayıcılar kendi gizlilik metinlerine tabi olabilir.") },
    { title: t("İletişim"), body: t("Çerezler ve tercih kaydınızla ilgili sorularınızı info@seninrandevun.com adresine iletebilirsiniz.") },
  ]} />;
}
