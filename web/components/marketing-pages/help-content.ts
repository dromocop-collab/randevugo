/**
 * Yardım merkezi içerikleri. Cevaplar ürünün gerçek davranışına göre yazıldı
 * (ör. online iptal/değişiklik kuralları functions/src/index.ts customerChangePolicy ile aynı).
 *
 * Metinler tk() ile işaretli; help-center.tsx gösterirken t() ile çevirir (çapa kimlikleri Türkçe başlıktan üretilir).
 */
import { tk } from "@/i18n/config";

export type HelpMode = "customer" | "business";
export type HelpIconName = "search" | "calendar" | "clock" | "heart" | "wallet" | "shield" | "store" | "users" | "messages" | "card" | "chart";
export type HelpLink = { href: string; label: string };
export type HelpArticle = { title: string; answer: string[]; links?: HelpLink[] };
export type HelpTopic = { id: string; icon: HelpIconName; title: string; description: string; articles: HelpArticle[] };

export const customerTopics: HelpTopic[] = [
  {
    id: "kesif", icon: "search", title: tk("Mağaza keşfetme"), description: tk("Doğru hizmeti, şehri ve işletmeyi daha hızlı bulun."),
    articles: [
      { title: tk("Arama ve filtreleri kullanma"), answer: [tk("Keşfet sayfasında arama kutusuna hizmet ya da işletme adını yazın; sonuçları kategori ve konuma göre daraltabilirsiniz."), tk("“Şimdi müsait” bölümü, yakın zamanda boş saati olan işletmeleri öne çıkarır.")], links: [{ href: "/kesfet", label: tk("Keşfet'i aç") }, { href: "/simdi-musait", label: tk("Şimdi müsait") }] },
      { title: tk("İşletme profilini değerlendirme"), answer: [tk("İşletme sayfasında hizmetleri ve fiyatları, ekibi, çalışma saatlerini, konumu ve müşteri yorumlarını tek yerde görürsünüz."), tk("Randevu almadan önce hizmet süresini ve işletmenin iptal kurallarını kontrol etmenizi öneririz.")] },
      { title: tk("Yorumlar ve puanlar"), answer: [tk("Yorum yalnızca tamamlanmış bir randevunun sahibi tarafından, hesabına giriş yapılarak bırakılabilir; bu sayede puanlar gerçek ziyaretlere dayanır."), tk("İşletmeler yorumlara yanıt verebilir. Bir yorumun gizlenmesi platform ekibinin incelemesinden geçer.")] },
    ],
  },
  {
    id: "randevu", icon: "calendar", title: tk("Randevu oluşturma"), description: tk("Hizmet, çalışan ve müsait saati güvenle seçin."),
    articles: [
      { title: tk("İlk randevumu nasıl alırım?"), answer: [tk("İşletme sayfasında hizmeti seçin, ardından uzmanı ve size uyan saati belirleyin. Ad ve telefon bilgilerinizi girip randevuyu onaylayın."), tk("Hesabınızla giriş yaparsanız randevularınızı Hesabım ekranından tek yerden takip edebilirsiniz.")], links: [{ href: "/kesfet", label: tk("İşletme bul") }, { href: "/hesabim", label: tk("Hesabım") }] },
      { title: tk("Doğru çalışanı seçme"), answer: [tk("Her hizmet, o hizmeti veren çalışanlarla eşleşir; listede yalnızca seçtiğiniz hizmeti yapabilen kişiler görünür."), tk("Belirli bir tercihiniz yoksa uygun ilk çalışanı seçerek daha fazla saat seçeneği görebilirsiniz.")] },
      { title: tk("Randevu onayı nasıl gelir?"), answer: [tk("Randevunuz oluşturulduğunda durumu ekranda görünür; işletmenin ayarına göre doğrudan onaylanır ya da işletme onayı bekler."), tk("Onay ve değişiklik bilgileri SMS, e-posta veya uygulama bildirimiyle iletilir. Mesajdaki bağlantıdan randevunuzu görüntüleyebilirsiniz.")] },
    ],
  },
  {
    id: "degisiklik", icon: "clock", title: tk("Değişiklik ve iptal"), description: tk("Yaklaşan randevularınızı tek yerden yönetin."),
    articles: [
      { title: tk("Randevu tarihini değiştirme"), answer: [tk("Hesabım ekranından ya da SMS/e-postadaki randevu bağlantısından yeni bir saat seçebilirsiniz."), tk("Bir randevunun saati online olarak en fazla 3 kez değiştirilebilir. İşletme online değişikliğe kapalıysa veya randevuya çok az kaldıysa işletmeyle doğrudan iletişime geçin.")], links: [{ href: "/hesabim", label: tk("Randevularım") }] },
      { title: tk("Randevu iptal koşulları"), answer: [tk("İptal süresini her işletme kendisi belirler; varsayılan olarak randevuya 2 saatten az kaldığında online iptal kapanır."), tk("Geçmiş veya tamamlanmış randevular iptal edilemez. Online iptal kapalıysa işletmeyi arayarak bilgi verin.")] },
      { title: tk("Gecikme durumunda ne yapmalıyım?"), answer: [tk("Gecikeceğinizi fark ettiğinizde işletmeyi mümkün olan en kısa sürede arayın; işletme sayfasındaki telefon ve WhatsApp bağlantılarını kullanabilirsiniz."), tk("Canlı sıra kullanan işletmelerde sıranızı “Sıram” ekranından takip edebilirsiniz.")], links: [{ href: "/siram", label: tk("Sıram") }] },
    ],
  },
  {
    id: "hesap", icon: "heart", title: tk("Hesabım ve favoriler"), description: tk("Geçmişinizi, favorilerinizi ve profilinizi düzenleyin."),
    articles: [
      { title: tk("Müşteri hesabı oluşturma"), answer: [tk("Kayıt ol sayfasından e-posta adresinizle ücretsiz hesap açabilirsiniz. Aynı hesapla web sitesinde ve mobil uygulamada giriş yaparsınız.")], links: [{ href: "/kayit", label: tk("Kayıt ol") }, { href: "/giris", label: tk("Giriş yap") }] },
      { title: tk("Favori mağaza ekleme"), answer: [tk("İşletme kartlarındaki ve sayfalarındaki kalp simgesine dokunarak işletmeyi favorilerinize ekleyin; favorileriniz hesabınızda saklanır.")] },
      { title: tk("Hesap bilgilerimi güncelleme"), answer: [tk("Hesabım ekranından ad, telefon ve bildirim tercihlerinizi güncelleyebilirsiniz. Hesabınızı kapatma seçeneği de aynı ekranda yer alır.")], links: [{ href: "/hesabim", label: tk("Hesabım") }] },
    ],
  },
  {
    id: "odeme", icon: "wallet", title: tk("Fiyat ve ödeme"), description: tk("Fiyatların ve işletme ödeme seçeneklerinin işleyişi."),
    articles: [
      { title: tk("Hizmet fiyatları nerede görünür?"), answer: [tk("Fiyatlar işletme sayfasındaki hizmet listesinde ve randevu adımlarında gösterilir. Fiyatları işletme belirler ve günceller.")] },
      { title: tk("Ödeme işletmeye nasıl yapılır?"), answer: [tk("SeninRandevun randevu sırasında sizden kart bilgisi almaz. Ödemenizi hizmet sırasında veya sonrasında doğrudan işletmeye, işletmenin kabul ettiği yöntemle yaparsınız.")] },
      { title: tk("İade için kiminle görüşmeliyim?"), answer: [tk("Ödeme işletmeye yapıldığı için iade ve fiyat konularında işletmeyle görüşmeniz gerekir. Çözülemeyen bir durum olursa bize destek talebi bırakabilirsiniz.")] },
    ],
  },
  {
    id: "guvenlik", icon: "shield", title: tk("Güvenlik ve gizlilik"), description: tk("Hesabınız ve kişisel verileriniz için yardım alın."),
    articles: [
      { title: tk("Şifremi sıfırlama"), answer: [tk("Giriş ekranındaki “Şifremi unuttum” bağlantısından e-posta adresinizi girin; şifre sıfırlama bağlantısı e-postanıza gönderilir.")], links: [{ href: "/sifremi-unuttum", label: tk("Şifremi unuttum") }] },
      { title: tk("Kişisel verilerim nasıl korunur?"), answer: [tk("Verileriniz şifreli bağlantılarla aktarılır ve yalnızca randevunuzu yönetmek için gereken kişilerle paylaşılır. Ayrıntılar Gizlilik Politikası ve KVKK Aydınlatma Metni'nde yer alır.")], links: [{ href: "/gizlilik", label: tk("Gizlilik") }, { href: "/kvkk", label: tk("KVKK") }] },
      { title: tk("Şüpheli bir durumu bildirme"), answer: [tk("Hesabınızda tanımadığınız bir işlem görürseniz şifrenizi hemen değiştirin ve info@seninrandevun.com adresine konu satırında “Güvenlik” yazarak bize ulaşın.")], links: [{ href: "/guvenlik", label: tk("Güvenlik") }] },
    ],
  },
];

export const businessTopics: HelpTopic[] = [
  {
    id: "kurulum", icon: "store", title: tk("Kurulum ve mağaza"), description: tk("Profilinizi eksiksiz kurup keşfete hazır hâle getirin."),
    articles: [
      { title: tk("İşletme çalışma alanını açma"), answer: [tk("İşletme kayıt sayfasından hesabınızı ve işletmenizi birkaç adımda oluşturun. Lansman kampanyası kapsamında ilk ay ücretsizdir, kredi kartı gerekmez.")], links: [{ href: "/isletmeler/kayit", label: tk("İşletme kaydı") }] },
      { title: tk("Logo, kapak ve konum ekleme"), answer: [tk("Panelde Ayarlar bölümünden logo, kapak görseli, açıklama, adres ve iletişim bilgilerinizi ekleyin. Eksiksiz profil keşfette daha güven verir.")], links: [{ href: "/dashboard/ayarlar", label: tk("Ayarlar") }] },
      { title: tk("Mağazayı yayına alma kontrolü"), answer: [tk("Yeni mağazalar, platform ekibinin kısa incelemesinden sonra yayına alınır. Bu sürede hizmetlerinizi, ekibinizi ve çalışma saatlerinizi tamamlayın."), tk("Yayına girdikten sonra mağaza bağlantınızı ve QR kodunuzu paylaşarak online randevu almaya başlayabilirsiniz.")] },
    ],
  },
  {
    id: "takvim", icon: "calendar", title: tk("Takvim ve randevular"), description: tk("Günlük akışı, durumları ve müsaitliği yönetin."),
    articles: [
      { title: tk("Takvim görünümünü kullanma"), answer: [tk("Takvim ekranında günlük, haftalık ve aylık görünüm arasında geçiş yapın; çalışan filtresiyle tek kişinin gününe odaklanın."), tk("Çakışan saatler sistem tarafından engellenir; çalışma saatleri, molalar ve özel günler müsaitliğe otomatik yansır.")], links: [{ href: "/dashboard/takvim", label: tk("Takvim") }] },
      { title: tk("Manuel randevu ekleme"), answer: [tk("Telefonla ya da kapıdan gelen müşteriler için takvimden veya hızlı randevu düğmesinden müşteri, hizmet, çalışan ve saati seçerek randevu oluşturun.")] },
      { title: tk("İptal ve gelmedi durumları"), answer: [tk("Randevu kartından durumu güncelleyin: onaylandı, tamamlandı, iptal veya gelmedi. Gelmedi kayıtları müşteri kartındaki geçmişe işlenir."), tk("Müşterilerin online iptal ve saat değişikliği yapıp yapamayacağını ve son süreyi ayarlardan siz belirlersiniz.")] },
    ],
  },
  {
    id: "ekip", icon: "users", title: tk("Ekip ve hizmetler"), description: tk("Çalışan, yetki, süre ve fiyat düzeninizi kurun."),
    articles: [
      { title: tk("Çalışan ve rol ekleme"), answer: [tk("Çalışanlar bölümünden ekip üyesi ekleyin. Dört rol vardır: İşletme Sahibi, Yönetici, Müdür ve Çalışan. Çalışan rolü yalnızca kendi randevularını ve takvimini görür."), tk("Çalışanın e-posta adresini girdiğinizde hesabı işletmenize otomatik bağlanır.")], links: [{ href: "/dashboard/calisanlar", label: tk("Çalışanlar") }] },
      { title: tk("Hizmet kataloğu oluşturma"), answer: [tk("Hizmetler bölümünde her hizmet için ad, süre ve fiyat girin. Süreler takvimdeki müsaitlik hesabında kullanılır.")], links: [{ href: "/dashboard/hizmetler", label: tk("Hizmetler") }] },
      { title: tk("Çalışana hizmet atama"), answer: [tk("Hizmet ya da çalışan kartından hangi çalışanın hangi hizmeti verdiğini işaretleyin; müşteriler randevu alırken yalnızca uygun çalışanları görür.")] },
    ],
  },
  {
    id: "iletisim", icon: "messages", title: tk("Müşteri ve iletişim"), description: tk("CRM kayıtlarını ve otomatik iletişimi güçlendirin."),
    articles: [
      { title: tk("Müşteri kartlarını yönetme"), answer: [tk("Randevu alan her müşteri için otomatik bir kart oluşur. Kartta geçmiş ve yaklaşan randevular, notlar, paketler ve sadakat puanı yer alır.")], links: [{ href: "/dashboard/musteriler", label: tk("Müşteriler") }] },
      { title: tk("Hatırlatma akışları"), answer: [tk("Randevu onayı, değişiklik ve hatırlatma mesajları SMS ve uygulama bildirimiyle otomatik gönderilir; uygulamayı kullanan müşterilere randevudan 1 saat önce bildirim gider."), tk("Yeni, iptal edilen veya değişen randevular için ekibinize de anlık bildirim ulaşır.")], links: [{ href: "/dashboard/otomasyonlar", label: tk("Otomasyonlar") }] },
      { title: tk("Yorumlara profesyonel yanıt verme"), answer: [tk("Yorumlar bölümünden her değerlendirmeye herkese açık yanıt yazabilirsiniz. Uygunsuz bulduğunuz bir yorum için gizleme talebi oluşturabilirsiniz; talep platform ekibince incelenir.")], links: [{ href: "/dashboard/yorumlar", label: tk("Yorumlar") }] },
    ],
  },
  {
    id: "abonelik", icon: "card", title: tk("Plan ve abonelik"), description: tk("Ücretsiz dönem, fatura ve abonelik detaylarını öğrenin."),
    articles: [
      { title: tk("İlk ay ücretsiz kampanyası nasıl çalışır?"), answer: [tk("Lansman döneminde açılan işletme hesapları 30 gün boyunca tüm özellikleri ücretsiz kullanır; başlamak için kredi kartı gerekmez.")], links: [{ href: "/fiyatlar", label: tk("Fiyatlar") }] },
      { title: tk("Abonelik ve ödeme adımları"), answer: [tk("Tek plan vardır ve tüm özellikler açıktır. Panelde Abonelik bölümünden aylık veya yıllık plan için talep oluşturursunuz; ekibimiz ödeme adımlarını sizinle paylaşır.")], links: [{ href: "/dashboard/abonelik", label: tk("Abonelik") }, { href: "/fiyatlar", label: tk("Plan detayları") }] },
      { title: tk("Plan durumunu görüntüleme"), answer: [tk("Abonelik ekranında deneme süresinin ne zaman biteceğini ve mevcut plan durumunuzu görürsünüz. Süre yaklaşırken panelde bilgilendirme gösterilir.")] },
    ],
  },
  {
    id: "analitik", icon: "chart", title: tk("Analitik ve performans"), description: tk("Raporları okuyup daha net yönetim kararları alın."),
    articles: [
      { title: tk("Doluluk oranını yorumlama"), answer: [tk("Doluluk, çalışma saatlerinize göre ne kadar zamanın randevuyla dolduğunu gösterir. Düşük doluluklu günleri fark edip çalışma saatlerinizi ve ekip planınızı buna göre düzenleyebilirsiniz.")], links: [{ href: "/dashboard/analitik", label: tk("Analiz & Büyüme") }] },
      { title: tk("Gelir ve hizmet performansı"), answer: [tk("Analiz ekranında gelir, en çok tercih edilen hizmetler ve ekip performansı birlikte görünür. Kasa & Operasyon'da kaydedilen ödemeler gelire yansır.")] },
      { title: tk("Müşteri kayıtlarını yorumlama"), answer: [tk("Müşteri kartlarındaki ziyaret sayısı, son ziyaret ve gelmedi kayıtları hangi müşterilerin düzenli geldiğini gösterir. Uzun süredir gelmeyen müşterilere ulaşmak için müşteri listesini kullanın.")] },
    ],
  },
];

export const quickStart: Record<HelpMode, Array<[string, string]>> = {
  customer: [["01", tk("Aradığınız hizmeti keşfedin")], ["02", tk("İşletme, çalışan ve saati seçin")], ["03", tk("Hesabınızdan randevunuzu takip edin")]],
  business: [["01", tk("Mağaza profilini tamamlayın")], ["02", tk("Hizmet, ekip ve saatleri ekleyin")], ["03", tk("Bağlantınızı paylaşıp randevu alın")]],
};

export function helpSlug(value: string) {
  return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); // i18n-ignore
}

export function normalizeQuery(value: string) {
  return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").trim(); // i18n-ignore
}
