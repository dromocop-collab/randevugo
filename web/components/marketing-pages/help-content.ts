/**
 * Yardım merkezi içerikleri. Cevaplar ürünün gerçek davranışına göre yazıldı
 * (ör. online iptal/değişiklik kuralları functions/src/index.ts customerChangePolicy ile aynı).
 */
export type HelpMode = "customer" | "business";
export type HelpIconName = "search" | "calendar" | "clock" | "heart" | "wallet" | "shield" | "store" | "users" | "messages" | "card" | "chart";
export type HelpLink = { href: string; label: string };
export type HelpArticle = { title: string; answer: string[]; links?: HelpLink[] };
export type HelpTopic = { id: string; icon: HelpIconName; title: string; description: string; articles: HelpArticle[] };

export const customerTopics: HelpTopic[] = [
  {
    id: "kesif", icon: "search", title: "Mağaza keşfetme", description: "Doğru hizmeti, şehri ve işletmeyi daha hızlı bulun.",
    articles: [
      { title: "Arama ve filtreleri kullanma", answer: ["Keşfet sayfasında arama kutusuna hizmet ya da işletme adını yazın; sonuçları kategori ve konuma göre daraltabilirsiniz.", "“Şimdi müsait” bölümü, yakın zamanda boş saati olan işletmeleri öne çıkarır."], links: [{ href: "/kesfet", label: "Keşfet'i aç" }, { href: "/simdi-musait", label: "Şimdi müsait" }] },
      { title: "İşletme profilini değerlendirme", answer: ["İşletme sayfasında hizmetleri ve fiyatları, ekibi, çalışma saatlerini, konumu ve müşteri yorumlarını tek yerde görürsünüz.", "Randevu almadan önce hizmet süresini ve işletmenin iptal kurallarını kontrol etmenizi öneririz."] },
      { title: "Yorumlar ve puanlar", answer: ["Yorum yalnızca tamamlanmış bir randevunun sahibi tarafından, hesabına giriş yapılarak bırakılabilir; bu sayede puanlar gerçek ziyaretlere dayanır.", "İşletmeler yorumlara yanıt verebilir. Bir yorumun gizlenmesi platform ekibinin incelemesinden geçer."] },
    ],
  },
  {
    id: "randevu", icon: "calendar", title: "Randevu oluşturma", description: "Hizmet, çalışan ve müsait saati güvenle seçin.",
    articles: [
      { title: "İlk randevumu nasıl alırım?", answer: ["İşletme sayfasında hizmeti seçin, ardından uzmanı ve size uyan saati belirleyin. Ad ve telefon bilgilerinizi girip randevuyu onaylayın.", "Hesabınızla giriş yaparsanız randevularınızı Hesabım ekranından tek yerden takip edebilirsiniz."], links: [{ href: "/kesfet", label: "İşletme bul" }, { href: "/hesabim", label: "Hesabım" }] },
      { title: "Doğru çalışanı seçme", answer: ["Her hizmet, o hizmeti veren çalışanlarla eşleşir; listede yalnızca seçtiğiniz hizmeti yapabilen kişiler görünür.", "Belirli bir tercihiniz yoksa uygun ilk çalışanı seçerek daha fazla saat seçeneği görebilirsiniz."] },
      { title: "Randevu onayı nasıl gelir?", answer: ["Randevunuz oluşturulduğunda durumu ekranda görünür; işletmenin ayarına göre doğrudan onaylanır ya da işletme onayı bekler.", "Onay ve değişiklik bilgileri SMS, e-posta veya uygulama bildirimiyle iletilir. Mesajdaki bağlantıdan randevunuzu görüntüleyebilirsiniz."] },
    ],
  },
  {
    id: "degisiklik", icon: "clock", title: "Değişiklik ve iptal", description: "Yaklaşan randevularınızı tek yerden yönetin.",
    articles: [
      { title: "Randevu tarihini değiştirme", answer: ["Hesabım ekranından ya da SMS/e-postadaki randevu bağlantısından yeni bir saat seçebilirsiniz.", "Bir randevunun saati online olarak en fazla 3 kez değiştirilebilir. İşletme online değişikliğe kapalıysa veya randevuya çok az kaldıysa işletmeyle doğrudan iletişime geçin."], links: [{ href: "/hesabim", label: "Randevularım" }] },
      { title: "Randevu iptal koşulları", answer: ["İptal süresini her işletme kendisi belirler; varsayılan olarak randevuya 2 saatten az kaldığında online iptal kapanır.", "Geçmiş veya tamamlanmış randevular iptal edilemez. Online iptal kapalıysa işletmeyi arayarak bilgi verin."] },
      { title: "Gecikme durumunda ne yapmalıyım?", answer: ["Gecikeceğinizi fark ettiğinizde işletmeyi mümkün olan en kısa sürede arayın; işletme sayfasındaki telefon ve WhatsApp bağlantılarını kullanabilirsiniz.", "Canlı sıra kullanan işletmelerde sıranızı “Sıram” ekranından takip edebilirsiniz."], links: [{ href: "/siram", label: "Sıram" }] },
    ],
  },
  {
    id: "hesap", icon: "heart", title: "Hesabım ve favoriler", description: "Geçmişinizi, favorilerinizi ve profilinizi düzenleyin.",
    articles: [
      { title: "Müşteri hesabı oluşturma", answer: ["Kayıt ol sayfasından e-posta adresinizle ücretsiz hesap açabilirsiniz. Aynı hesapla web sitesinde ve mobil uygulamada giriş yaparsınız."], links: [{ href: "/kayit", label: "Kayıt ol" }, { href: "/giris", label: "Giriş yap" }] },
      { title: "Favori mağaza ekleme", answer: ["İşletme kartlarındaki ve sayfalarındaki kalp simgesine dokunarak işletmeyi favorilerinize ekleyin; favorileriniz hesabınızda saklanır."] },
      { title: "Hesap bilgilerimi güncelleme", answer: ["Hesabım ekranından ad, telefon ve bildirim tercihlerinizi güncelleyebilirsiniz. Hesabınızı kapatma seçeneği de aynı ekranda yer alır."], links: [{ href: "/hesabim", label: "Hesabım" }] },
    ],
  },
  {
    id: "odeme", icon: "wallet", title: "Fiyat ve ödeme", description: "Fiyatların ve işletme ödeme seçeneklerinin işleyişi.",
    articles: [
      { title: "Hizmet fiyatları nerede görünür?", answer: ["Fiyatlar işletme sayfasındaki hizmet listesinde ve randevu adımlarında gösterilir. Fiyatları işletme belirler ve günceller."] },
      { title: "Ödeme işletmeye nasıl yapılır?", answer: ["SeninRandevun randevu sırasında sizden kart bilgisi almaz. Ödemenizi hizmet sırasında veya sonrasında doğrudan işletmeye, işletmenin kabul ettiği yöntemle yaparsınız."] },
      { title: "İade için kiminle görüşmeliyim?", answer: ["Ödeme işletmeye yapıldığı için iade ve fiyat konularında işletmeyle görüşmeniz gerekir. Çözülemeyen bir durum olursa bize destek talebi bırakabilirsiniz."] },
    ],
  },
  {
    id: "guvenlik", icon: "shield", title: "Güvenlik ve gizlilik", description: "Hesabınız ve kişisel verileriniz için yardım alın.",
    articles: [
      { title: "Şifremi sıfırlama", answer: ["Giriş ekranındaki “Şifremi unuttum” bağlantısından e-posta adresinizi girin; şifre sıfırlama bağlantısı e-postanıza gönderilir."], links: [{ href: "/sifremi-unuttum", label: "Şifremi unuttum" }] },
      { title: "Kişisel verilerim nasıl korunur?", answer: ["Verileriniz şifreli bağlantılarla aktarılır ve yalnızca randevunuzu yönetmek için gereken kişilerle paylaşılır. Ayrıntılar Gizlilik Politikası ve KVKK Aydınlatma Metni'nde yer alır."], links: [{ href: "/gizlilik", label: "Gizlilik" }, { href: "/kvkk", label: "KVKK" }] },
      { title: "Şüpheli bir durumu bildirme", answer: ["Hesabınızda tanımadığınız bir işlem görürseniz şifrenizi hemen değiştirin ve info@seninrandevun.com adresine konu satırında “Güvenlik” yazarak bize ulaşın."], links: [{ href: "/guvenlik", label: "Güvenlik" }] },
    ],
  },
];

export const businessTopics: HelpTopic[] = [
  {
    id: "kurulum", icon: "store", title: "Kurulum ve mağaza", description: "Profilinizi eksiksiz kurup keşfete hazır hâle getirin.",
    articles: [
      { title: "İşletme çalışma alanını açma", answer: ["İşletme kayıt sayfasından hesabınızı ve işletmenizi birkaç adımda oluşturun. Lansman kampanyası kapsamında ilk 3 ay ücretsizdir, kredi kartı gerekmez."], links: [{ href: "/isletmeler/kayit", label: "İşletme kaydı" }] },
      { title: "Logo, kapak ve konum ekleme", answer: ["Panelde Ayarlar bölümünden logo, kapak görseli, açıklama, adres ve iletişim bilgilerinizi ekleyin. Eksiksiz profil keşfette daha güven verir."], links: [{ href: "/dashboard/ayarlar", label: "Ayarlar" }] },
      { title: "Mağazayı yayına alma kontrolü", answer: ["Yeni mağazalar, platform ekibinin kısa incelemesinden sonra yayına alınır. Bu sürede hizmetlerinizi, ekibinizi ve çalışma saatlerinizi tamamlayın.", "Yayına girdikten sonra mağaza bağlantınızı ve QR kodunuzu paylaşarak online randevu almaya başlayabilirsiniz."] },
    ],
  },
  {
    id: "takvim", icon: "calendar", title: "Takvim ve randevular", description: "Günlük akışı, durumları ve müsaitliği yönetin.",
    articles: [
      { title: "Takvim görünümünü kullanma", answer: ["Takvim ekranında günlük, haftalık ve aylık görünüm arasında geçiş yapın; çalışan filtresiyle tek kişinin gününe odaklanın.", "Çakışan saatler sistem tarafından engellenir; çalışma saatleri, molalar ve özel günler müsaitliğe otomatik yansır."], links: [{ href: "/dashboard/takvim", label: "Takvim" }] },
      { title: "Manuel randevu ekleme", answer: ["Telefonla ya da kapıdan gelen müşteriler için takvimden veya hızlı randevu düğmesinden müşteri, hizmet, çalışan ve saati seçerek randevu oluşturun."] },
      { title: "İptal ve gelmedi durumları", answer: ["Randevu kartından durumu güncelleyin: onaylandı, tamamlandı, iptal veya gelmedi. Gelmedi kayıtları müşteri kartındaki geçmişe işlenir.", "Müşterilerin online iptal ve saat değişikliği yapıp yapamayacağını ve son süreyi ayarlardan siz belirlersiniz."] },
    ],
  },
  {
    id: "ekip", icon: "users", title: "Ekip ve hizmetler", description: "Çalışan, yetki, süre ve fiyat düzeninizi kurun.",
    articles: [
      { title: "Çalışan ve rol ekleme", answer: ["Çalışanlar bölümünden ekip üyesi ekleyin. Dört rol vardır: İşletme Sahibi, Yönetici, Müdür ve Çalışan. Çalışan rolü yalnızca kendi randevularını ve takvimini görür.", "Çalışanın e-posta adresini girdiğinizde hesabı işletmenize otomatik bağlanır."], links: [{ href: "/dashboard/calisanlar", label: "Çalışanlar" }] },
      { title: "Hizmet kataloğu oluşturma", answer: ["Hizmetler bölümünde her hizmet için ad, süre ve fiyat girin. Süreler takvimdeki müsaitlik hesabında kullanılır."], links: [{ href: "/dashboard/hizmetler", label: "Hizmetler" }] },
      { title: "Çalışana hizmet atama", answer: ["Hizmet ya da çalışan kartından hangi çalışanın hangi hizmeti verdiğini işaretleyin; müşteriler randevu alırken yalnızca uygun çalışanları görür."] },
    ],
  },
  {
    id: "iletisim", icon: "messages", title: "Müşteri ve iletişim", description: "CRM kayıtlarını ve otomatik iletişimi güçlendirin.",
    articles: [
      { title: "Müşteri kartlarını yönetme", answer: ["Randevu alan her müşteri için otomatik bir kart oluşur. Kartta geçmiş ve yaklaşan randevular, notlar, paketler ve sadakat puanı yer alır."], links: [{ href: "/dashboard/musteriler", label: "Müşteriler" }] },
      { title: "Hatırlatma akışları", answer: ["Randevu onayı, değişiklik ve hatırlatma mesajları SMS ve uygulama bildirimiyle otomatik gönderilir; uygulamayı kullanan müşterilere randevudan 1 saat önce bildirim gider.", "Yeni, iptal edilen veya değişen randevular için ekibinize de anlık bildirim ulaşır."], links: [{ href: "/dashboard/otomasyonlar", label: "Otomasyonlar" }] },
      { title: "Yorumlara profesyonel yanıt verme", answer: ["Yorumlar bölümünden her değerlendirmeye herkese açık yanıt yazabilirsiniz. Uygunsuz bulduğunuz bir yorum için gizleme talebi oluşturabilirsiniz; talep platform ekibince incelenir."], links: [{ href: "/dashboard/yorumlar", label: "Yorumlar" }] },
    ],
  },
  {
    id: "abonelik", icon: "card", title: "Plan ve abonelik", description: "Ücretsiz dönem, fatura ve abonelik detaylarını öğrenin.",
    articles: [
      { title: "İlk 3 ay ücretsiz kampanyası nasıl çalışır?", answer: ["Lansman döneminde açılan işletme hesapları 90 gün boyunca tüm özellikleri ücretsiz kullanır; başlamak için kredi kartı gerekmez."], links: [{ href: "/fiyatlar", label: "Fiyatlar" }] },
      { title: "Abonelik ve ödeme adımları", answer: ["Tek plan vardır ve tüm özellikler açıktır. Panelde Abonelik bölümünden aylık veya yıllık plan için talep oluşturursunuz; ekibimiz ödeme adımlarını sizinle paylaşır."], links: [{ href: "/dashboard/abonelik", label: "Abonelik" }, { href: "/fiyatlar", label: "Plan detayları" }] },
      { title: "Plan durumunu görüntüleme", answer: ["Abonelik ekranında deneme süresinin ne zaman biteceğini ve mevcut plan durumunuzu görürsünüz. Süre yaklaşırken panelde bilgilendirme gösterilir."] },
    ],
  },
  {
    id: "analitik", icon: "chart", title: "Analitik ve performans", description: "Raporları okuyup daha net yönetim kararları alın.",
    articles: [
      { title: "Doluluk oranını yorumlama", answer: ["Doluluk, çalışma saatlerinize göre ne kadar zamanın randevuyla dolduğunu gösterir. Düşük doluluklu günleri fark edip çalışma saatlerinizi ve ekip planınızı buna göre düzenleyebilirsiniz."], links: [{ href: "/dashboard/analitik", label: "Analiz & Büyüme" }] },
      { title: "Gelir ve hizmet performansı", answer: ["Analiz ekranında gelir, en çok tercih edilen hizmetler ve ekip performansı birlikte görünür. Kasa & Operasyon'da kaydedilen ödemeler gelire yansır."] },
      { title: "Müşteri kayıtlarını yorumlama", answer: ["Müşteri kartlarındaki ziyaret sayısı, son ziyaret ve gelmedi kayıtları hangi müşterilerin düzenli geldiğini gösterir. Uzun süredir gelmeyen müşterilere ulaşmak için müşteri listesini kullanın."] },
    ],
  },
];

export const quickStart: Record<HelpMode, Array<[string, string]>> = {
  customer: [["01", "Aradığınız hizmeti keşfedin"], ["02", "İşletme, çalışan ve saati seçin"], ["03", "Hesabınızdan randevunuzu takip edin"]],
  business: [["01", "Mağaza profilini tamamlayın"], ["02", "Hizmet, ekip ve saatleri ekleyin"], ["03", "Bağlantınızı paylaşıp randevu alın"]],
};

export function helpSlug(value: string) {
  return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function normalizeQuery(value: string) {
  return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i").trim();
}
