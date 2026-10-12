import { ContentPage } from "@/components/marketing/content-page";
import { SELLER, TERMS_DATE_LABEL, TERMS_VERSION, sellerLines } from "@/lib/legal/seller";
import { createPublicMetadata } from "@/lib/seo/metadata";

export const metadata = createPublicMetadata({
  title: "Mesafeli Satış Sözleşmesi",
  description: "SeninRandevun işletme paketi aboneliğinin web üzerinden satın alınmasına ilişkin mesafeli satış ve abonelik sözleşmesi.",
  pathname: "/mesafeli-satis-sozlesmesi",
  type: "article",
});

export default function Page() {
  return <ContentPage eyebrow={`YASAL · ${TERMS_DATE_LABEL} · SÜRÜM ${TERMS_VERSION}`} title="Mesafeli satış ve abonelik sözleşmesi" intro="Bu sözleşme, SeninRandevun işletme paketlerinin seninrandevun.com üzerinden elektronik ortamda satın alınmasına ilişkin tarafların hak ve yükümlülüklerini düzenler. Alıcı, ödeme adımından önce Ön Bilgilendirme Formu'nu ve bu sözleşmeyi okuyup elektronik ortamda onaylar." cta={false} sections={[
    {
      title: "Taraflar",
      body: `Bu sözleşme, aşağıda bilgileri yer alan satıcı ("${SELLER.brand}" veya "Satıcı") ile seninrandevun.com işletme panelinde paket satın alan işletme hesabı sahibi veya yetkilisi ("Alıcı") arasında kurulur. Alıcı'nın ad-soyad/unvan, e-posta, telefon ve adres bilgileri işletme hesabından ve ödeme sırasında beyan edilen bilgilerden alınır.`,
      bullets: sellerLines(),
    },
    {
      title: "Tanımlar",
      body: "Bu sözleşmede geçen terimler aşağıdaki anlamları taşır:",
      bullets: [
        "Platform: seninrandevun.com internet sitesi, işletme paneli ve SeninRandevun mobil uygulamaları.",
        "Paket: Platform'da yayımlanan, kapsamı ve fiyatı satın alma ekranında gösterilen işletme abonelik planı.",
        "Dönem: Satın alınan kullanım süresi; aylık pakette 1 takvim ayı, yıllık pakette 1 takvim yılıdır.",
        "Ödeme Kuruluşu: Kart ödemelerine aracılık eden, 6493 sayılı Kanun kapsamında lisanslı PayTR Ödeme ve Elektronik Para Kuruluşu A.Ş.",
        "Tüketici: 6502 sayılı Tüketicinin Korunması Hakkında Kanun anlamında ticari veya mesleki olmayan amaçlarla hareket eden gerçek veya tüzel kişi.",
      ],
    },
    {
      title: "Sözleşmenin konusu",
      body: "Sözleşmenin konusu, Alıcı'nın seçtiği Paket'in seçilen Dönem boyunca Platform üzerinde kullanım hakkının (yazılım hizmeti) elektronik ortamda sağlanması ve bunun karşılığında bedelin ödenmesidir. Hizmet; randevu, takvim, çalışan, hizmet, müşteri ve Paket kapsamındaki diğer modüllerin kullanımını içerir. Satıcı, işletmenin müşterilerine sunduğu asıl hizmetin (kuaförlük, sağlık, güzellik vb.) tarafı veya sağlayıcısı değildir.",
    },
    {
      title: "Hizmetin temel nitelikleri ve bedel",
      body: "Paket adı, kapsamı, şube/çalışan sınırları, Dönem ve tüm vergiler dahil toplam bedel, satın alma ekranında ve Ön Bilgilendirme Formu'nda gösterilir. Gösterilen fiyatlara KDV dahildir; kurulum, aktivasyon veya gizli ek ücret yoktur. Ödeme ekranında gösterilen bedel sözleşme bedelidir ve Dönem boyunca değiştirilemez.",
    },
    {
      title: "Ödeme ve fatura",
      body: "Bedel, banka veya kredi kartıyla, Ödeme Kuruluşu altyapısında 3D Secure doğrulamasıyla, tek seferde ve peşin tahsil edilir. Kart bilgileri Satıcı'nın sistemlerinde işlenmez ve saklanmaz. Alıcı, kullandığı kartın kendisine ait olduğunu veya kullanım yetkisi bulunduğunu beyan eder. Ödemeye ilişkin fatura, vergi mevzuatına uygun olarak Alıcı'nın hesap bilgileri esas alınarak elektronik ortamda düzenlenir ve Alıcı'nın e-posta adresine iletilir; fatura bilgilerinin doğruluğundan Alıcı sorumludur.",
    },
    {
      title: "İfa ve hizmetin başlaması",
      body: "Hizmet fiziksel teslimat gerektirmez. Ödeme Kuruluşu ödemeyi onayladığında Paket, Alıcı'nın işletmesine ve varsa aynı organizasyona bağlı şubelere otomatik olarak tanımlanır ve işletme panelinde görüntülenir. Alıcı'nın devam eden ücretsiz deneme süresi veya aktif ücretli dönemi varsa yeni Dönem bu sürenin bitiminden itibaren eklenir; kalan süre kaybolmaz. Ödeme alındığı halde Paket 24 saat içinde tanımlanmazsa Alıcı destek kanallarından bildirimde bulunabilir.",
    },
    {
      title: "Süre, yenileme ve sona erme",
      body: "Sözleşme satın alınan Dönem için kurulur. Abonelik kendiliğinden yenilenmez ve Alıcı'nın kartından onayı olmaksızın tekrar çekim yapılmaz. Dönem bitiminden önce Platform içinde hatırlatma yapılır. Dönem sona erdiğinde Paket'e bağlı özellikler (yeni online randevu kabulü dahil) durdurulabilir; Alıcı'nın kayıtları silinmez ve Alıcı yeni Dönem satın aldığında kaldığı yerden devam eder. Hesabın kalıcı silinmesi yalnız Alıcı'nın talebiyle ve mevzuattaki saklama yükümlülükleri saklı kalmak kaydıyla yapılır.",
    },
    {
      title: "Cayma hakkı",
      body: "Alıcı'nın Tüketici sıfatını taşıması halinde: Hizmet, elektronik ortamda anında ifa edilen bir hizmet olup Alıcı'nın onayıyla ödeme anında ifasına başlanır. Bu nedenle Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesinin birinci fıkrasının (ğ) bendi uyarınca cayma hakkı kullanılamaz. Alıcı, ödeme adımında bu durumu bildiğini ve hizmetin derhal başlamasını talep ettiğini onaylar. Alıcı'nın Tüketici sıfatı taşımadığı (işletme faaliyeti kapsamında satın aldığı) hallerde 6502 sayılı Kanun ve Mesafeli Sözleşmeler Yönetmeliği uygulanmaz; taraflar arasında 6102 sayılı Türk Ticaret Kanunu ve 6098 sayılı Türk Borçlar Kanunu hükümleri geçerlidir. Her iki halde de İptal ve İade Koşulları sayfasındaki iade halleri saklıdır.",
    },
    {
      title: "Satıcı'nın yükümlülükleri",
      body: "Satıcı, hizmeti makul özen, güncel güvenlik önlemleri ve mesleki standartlar çerçevesinde sunar; Alıcı verilerini yetkisiz erişime karşı korumak için uygun teknik ve idari tedbirleri alır. Planlı bakım çalışmaları mümkün olduğunca önceden duyurulur ve yoğun saatler dışında yapılır. Satıcı, hizmetin işleyişini iyileştirmek amacıyla özelliklerde değişiklik yapabilir; ancak satın alınmış Dönem içinde Paket'in esaslı özelliklerini Alıcı aleyhine kaldıramaz.",
    },
    {
      title: "Alıcı'nın yükümlülükleri",
      body: "Alıcı aşağıdaki hususlardan sorumludur:",
      bullets: [
        "Hesap, işletme ve fatura bilgilerini doğru ve güncel tutmak; giriş bilgilerini gizli tutmak ve yetkisiz kullanımı derhal bildirmek.",
        "Platform'u Kullanım Koşulları'na, mevzuata ve üçüncü kişilerin haklarına uygun kullanmak.",
        "Kendi müşterilerine ait kişisel verileri Platform'a aktarırken 6698 sayılı KVKK kapsamındaki aydınlatma ve gerekli hallerde açık rıza yükümlülüklerini yerine getirmek.",
        "Platform'da yayımladığı hizmet, fiyat, çalışma saati ve içeriklerin doğruluğunu sağlamak.",
        "Hizmeti tersine mühendislik, otomatik kötüye kullanım, güvenlik önlemlerini aşma veya hizmeti aksatma amacıyla kullanmamak.",
      ],
    },
    {
      title: "Kişisel verilerin korunması",
      body: "Alıcı'ya ait kişisel veriler KVKK Aydınlatma Metni ve Gizlilik Politikası çerçevesinde, sözleşmenin kurulması ve ifası, hukuki yükümlülüklerin yerine getirilmesi ve meşru menfaat hukuki sebeplerine dayanılarak işlenir. Alıcı'nın kendi müşterilerine ilişkin verilerde Alıcı veri sorumlusu, Satıcı ise Alıcı'nın talimatları doğrultusunda hareket eden veri işleyen konumundadır.",
    },
    {
      title: "Fikri mülkiyet",
      body: "Platform yazılımı, arayüzü, tasarımı, SeninRandevun markası ve özgün içerikleri üzerindeki tüm haklar Satıcı'ya aittir. Sözleşme, Alıcı'ya yalnız Dönem boyunca ve kendi işletmesi için devredilemez, münhasır olmayan bir kullanım hakkı verir. Alıcı'nın Platform'a yüklediği içerikler Alıcı'ya ait olmaya devam eder.",
    },
    {
      title: "Sorumluluğun sınırları",
      body: "Satıcı; internet altyapısı, barındırma, SMS, e-posta, bildirim ve ödeme hizmeti sağlayıcıları gibi üçüncü kişilerden kaynaklanan kesintilerden ve Alıcı'nın kendi kusurundan doğan zararlardan sorumlu değildir. Tüketici olmayan Alıcı'lar bakımından, kast ve ağır ihmal halleri saklı kalmak üzere Satıcı'nın sözleşmeden doğan toplam sorumluluğu, zarara konu Dönem için Alıcı'nın ödediği bedelle sınırlıdır; dolaylı zararlar ve kâr kaybı kapsam dışındadır. Tüketici Alıcı'lar bakımından emredici mevzuat hükümleri saklıdır.",
    },
    {
      title: "Askıya alma ve fesih",
      body: "Alıcı'nın bu sözleşmeye, Kullanım Koşulları'na veya mevzuata aykırı davranması, Platform'u hukuka aykırı amaçlarla kullanması ya da güvenliği tehlikeye atması hallerinde Satıcı hesabı önce uyararak, gecikmesinde sakınca bulunan hallerde derhal askıya alabilir; aykırılık giderilmezse sözleşmeyi feshedebilir. Alıcı'nın kusuruyla yapılan fesihlerde kullanılmayan süre bedeli iade edilmez. Satıcı'nın hizmeti kalıcı olarak sonlandırması halinde kullanılmayan süre bedeli Alıcı'ya oransal olarak iade edilir.",
    },
    {
      title: "Fiyat ve sözleşme değişiklikleri",
      body: "Satıcı paket fiyatlarını ve bu sözleşmeyi ileriye dönük olarak değiştirebilir. Değişiklikler, satın alınmış ve devam eden Dönem'i etkilemez; yalnız değişiklikten sonra yapılan satın almalara uygulanır. Sözleşmenin güncel sürümü bu sayfada yayımlanır ve her ödeme, ödeme anında onaylanan sürümle birlikte kayıt altına alınır.",
    },
    {
      title: "Mücbir sebep",
      body: "Doğal afet, salgın, savaş, terör, grev, genel internet veya enerji kesintisi, siber saldırı, resmi makam kararları ve tarafların kontrolü dışındaki benzeri haller mücbir sebep sayılır. Mücbir sebep süresince tarafların yükümlülükleri askıya alınır; mücbir sebep 30 günden uzun sürerse taraflardan her biri sözleşmeyi feshedebilir ve kullanılmayan süre bedeli oransal olarak iade edilir.",
    },
    {
      title: "Bildirimler ve delil sözleşmesi",
      body: "Taraflar arasındaki bildirimler, Alıcı'nın hesabında kayıtlı e-posta adresi, Platform içi bildirimler ve Satıcı'nın yukarıdaki iletişim bilgileri üzerinden yapılır. Taraflar, uyuşmazlıklarda Satıcı'nın elektronik kayıtlarının, sunucu ve işlem kayıtlarının, Ödeme Kuruluşu kayıtlarının ve e-posta yazışmalarının 6100 sayılı Hukuk Muhakemeleri Kanunu'nun 193. maddesi uyarınca kesin delil teşkil edeceğini kabul eder; bu hüküm Tüketici Alıcı'lar bakımından karşı delil sunma hakkını ortadan kaldırmaz.",
    },
    {
      title: "Uyuşmazlıkların çözümü",
      body: "Bu sözleşmeye Türk hukuku uygulanır. Tüketici Alıcı'lar şikâyet ve itirazlarını, Ticaret Bakanlığı'nca her yıl ilan edilen parasal sınırlar dahilinde yerleşim yerlerindeki veya işlemin yapıldığı yerdeki Tüketici Hakem Heyeti'ne, bu sınırları aşan uyuşmazlıklarda ise Tüketici Mahkemeleri'ne başvurabilir; dava şartı arabuluculuk hükümleri saklıdır. Tüketici olmayan Alıcı'larla doğacak uyuşmazlıklarda Fethiye Mahkemeleri ve İcra Daireleri yetkilidir.",
    },
    {
      title: "Yürürlük",
      body: `Bu sözleşme 19 maddeden ibarettir ve Alıcı'nın ödeme ekranında onay kutusunu işaretleyip ödemeyi tamamlamasıyla elektronik ortamda kurulmuş sayılır. Onaylanan sözleşme sürümü ve onay zamanı ödeme kaydıyla birlikte saklanır; sözleşmenin güncel metnine bu sayfadan, onaylanan sürüme ise talep halinde ${SELLER.email} adresinden ulaşılabilir.`,
    },
  ]} />;
}
