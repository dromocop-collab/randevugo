import { ContentPage } from "@/components/marketing/content-page";
import { getLocale, getT } from "@/i18n/server";
import { createPublicMetadata } from "@/lib/seo/metadata";

export async function generateMetadata() {
  const t = await getT();
  return createPublicMetadata({
    title: t("KVKK Aydınlatma Metni"),
    description: t("SeninRandevun kullanıcı, müşteri ve işletme verilerinin işlenmesi, aktarılması, saklanması ve KVKK kapsamındaki haklara ilişkin aydınlatma metni."),
    pathname: "/kvkk",
    type: "article",
    locale: await getLocale(),
  });
}

export default async function Page() {
  const t = await getT();
  const locale = await getLocale();
  const note = locale !== "tr" ? `${t("Bu metnin Türkçe sürümü esastır; İngilizce çeviri bilgi amaçlıdır.")} ` : "";
  return <ContentPage eyebrow={t("YASAL · 29 EYLÜL 2026")} title={t("KVKK aydınlatma metni")} intro={note + t("SeninRandevun kapsamında kişisel verilerin hangi amaçlarla, hangi hukuki sebeplerle ve kimlerle işlendiğini açıklar. Platformdaki işletmeler, kendi müşterilerine ilişkin işlemlerde ayrıca veri sorumlusu olabilir.")} cta={false} sections={[
    { title: t("Veri sorumlusu ve iletişim"), body: t("SeninRandevun hizmetinin veri sorumlusuna KVKK kapsamındaki başvurularınız için info@seninrandevun.com adresinden ulaşabilirsiniz. Başvurunun kimlik doğrulaması gerektirmesi halinde yalnızca talebin güvenli biçimde sonuçlandırılması için gerekli ek bilgiler istenir."), bullets: [
      t("Genel destek: info@seninrandevun.com"),
      t("Telefon: 0530 478 82 98"),
      t("İşletme müşterileri, randevu sahibine karşı kendi süreçlerinden ayrıca sorumludur."),
    ] },
    { title: t("İşlenen veri kategorileri"), body: t("Hizmetin niteliğine göre yalnızca gerekli veriler işlenir."), bullets: [
      t("Kimlik ve iletişim: ad-soyad, telefon, e-posta"),
      t("Hesap ve işletme: profil, yetki, mağaza, hizmet ve çalışan kayıtları"),
      t("Randevu: seçilen hizmet, çalışan, tarih-saat, işlem durumu ve kullanıcı notu"),
      t("İşlem güvenliği: oturum, cihaz, IP, doğrulama, hata ve denetim kayıtları"),
      t("Talep ve destek: mesajlar, başvuru içeriği ve çözüm kayıtları"),
    ] },
    { title: t("Amaçlar ve hukuki sebepler"), body: t("Veriler; hesabın ve randevunun kurulması veya ifası, güvenliğin sağlanması, taleplerin karşılanması ve mevzuat yükümlülüklerinin yerine getirilmesi için KVKK'nın 5. maddesindeki sözleşmenin kurulması veya ifası, hukuki yükümlülük, hakkın tesisi veya kullanılması ve meşru menfaat sebeplerine dayanılarak işlenir. Açık rıza gerektiren bağımsız bir işlem varsa ayrıca ve isteğe bağlı olarak alınır.") },
    { title: t("Randevu aydınlatması"), body: t("Randevu oluştururken verilen bilgiler, seçilen işletmeye randevuyu planlayabilmesi ve sizinle randevu hakkında iletişim kurabilmesi için iletilir. Telefon doğrulama kodu yalnızca doğrulama ve güvenlik amacıyla kullanılır; reklam izni anlamına gelmez."), bullets: [
      t("Zorunlu alanlar randevunun kurulması ve güvenliği için kullanılır."),
      t("İsteğe bağlı notlara sağlık veya diğer özel nitelikli verilerin yazılmaması önerilir."),
      t("İptal, değişiklik ve bildirim kayıtları işlem güvenliği için tutulabilir."),
    ] },
    { title: t("Aktarım ve yurt dışı"), body: t("Veriler; barındırma, kimlik doğrulama, bildirim, e-posta veya SMS ve güvenlik hizmeti sağlayıcılarıyla hizmetin gerektirdiği ölçüde; seçilen işletmeyle randevunun yürütülmesi amacıyla; yetkili kurumlarla ise hukuki zorunluluk halinde paylaşılabilir. Yurt dışına aktarım söz konusu olduğunda KVKK'nın 9. maddesindeki uygun güvenceler uygulanır.") },
    { title: t("Saklama, silme ve güvenlik"), body: t("Kayıtlar işleme amacı, sözleşme ilişkisi, uyuşmazlık ve mevzuattan doğan saklama yükümlülükleri boyunca tutulur; süre sona erdiğinde silinir, yok edilir veya anonimleştirilir. Yetkilendirme, erişim kaydı, şifreli aktarım, yedekleme ve rol tabanlı erişim gibi tedbirler uygulanır.") },
    { title: t("Haklarınız ve başvuru"), body: t("KVKK'nın 11. maddesi kapsamında verinizin işlenip işlenmediğini öğrenme, bilgi isteme, amacı ve amaca uygun kullanımı öğrenme, aktarılan kişileri bilme, düzeltme, silme veya yok etme, yapılan işlemlerin alıcılara bildirilmesini isteme, otomatik sonuçlara itiraz ve zarar halinde tazminat talep etme haklarına sahipsiniz."), bullets: [
      t("Başvuruda ad-soyad, iletişim bilgisi, talebin konusu ve kimliği doğrulayan bilgiler yer almalıdır."),
      t("Başvurular kural olarak en geç 30 gün içinde sonuçlandırılır."),
      t("Talebinizi info@seninrandevun.com adresine KVKK Başvurusu konusu ile iletebilirsiniz."),
    ] },
    { title: t("Güncellemeler"), body: t("Bu metin hizmet, işleme faaliyetleri veya mevzuat değiştiğinde güncellenebilir. Esaslı değişiklikler uygun kanallardan duyurulur; metnin güncel sürümü bu sayfada yayımlanır.") },
  ]} />;
}
