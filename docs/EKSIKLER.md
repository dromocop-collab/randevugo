# Senin Randevun — eksikler ve riskler listesi

21 Ekim 2026 tarihli tam denetimden çıktı: güvenlik, son özellikler, arayüz/çeviri/SEO, ölçek/maliyet, yasal uyum. HEAD 9634a1f.
Satır numaraları o tarihe aittir. Biten maddeyi `[x]` yap, commit hash'ini yanına yaz.

**Otomatik kontrollerin durumu (temiz):**
- tsc 0 hata, eslint 0, web birim testleri 97/97, functions testleri 93/93
- i18n eksik anahtar 0, CI son 6 çalıştırmada yeşil
- npm audit: web ve functions'ta yüksek/kritik açık yok
- Eksik Firestore indeksi bulunamadı

---

## P0 — Hemen (güvenlik açığı / para kaybı / veri bozulması)

- [ ] **iOS 1.4.1 (16)'yı gönder.** 1.4.0'da bildirime dokununca uygulama çöküyor (iOS 27, tüm bildirimler). Düzeltme hazır (31fb69a, 186a51c); hızlandırılmış inceleme iste.
- [ ] **Telefon doğrulama kodu atlanabiliyor.** `functions/src/index.ts:7455` `if (codeData.verified === true) return { kind: "ok" }` hash kontrolünden önce çalışıyor. Kurban kodunu doğruladıktan sonraki 5 dakikada başkası herhangi bir kodla aynı numarayı kendi hesabına "doğrulanmış" bağlayabilir; paket ve puan bilgisini görür, o numarayla randevu açabilir. → Doğrulanmış kayıtta da hash'i karşılaştır, `verifiedIdentity` yalnız gerçek eşleşmede yazılsın.
- [ ] **Başkasının müşteri paket/puan bilgisine erişim (IDOR).** `upsertCustomer` `userId`'yi istemciden alıyor (`index.ts:647`), `firestore.rules:604` customers'a alan kontrolsüz yazdırıyor. `getMyCustomerBenefits` (`:1076-1118`) bunu kimlik sayıp platformdaki tüm paket/puanları döndürüyor ve saldırgana bağlıyor. → `customers.userId` yalnız sunucu yazsın (rules'ta koru, callable'dan parametreyi kaldır); eşleştirme yalnız doğrulanmış telefon/e-postayla.
- [ ] **CRM sayaçları 2.000 müşteriden sonra sıfırlanıyor + her randevuda 2.000 okuma.** `upsertBusinessCustomer` `customers.limit(2_000).get()` (`index.ts:597`). Müşteri sayısı 2.000'i geçince kanonik belge sonuçta olmayabilir; `totalAppointments`, `totalSpent` ve `createdAt` ezilir. → `canonicalRef.get()` + `where("phoneKey","==",…)`, transaction içinde.
- [ ] **Seçenekli hizmette fiyat uyuşmazlığı.** Düzenleyici `price` alanına en düşük seçeneği, `durationMinutes` alanına ilk seçeneğin süresini yazıyor (`web/app/[lang]/dashboard/hizmetler/service-editor-sheet.tsx:125-129`). Sunucu `variantId` yoksa ilk seçeneği uyguluyor (`functions/src/service-pricing-domain.ts:51-56`). Sonuç: mobil "300 ₺" gösterir, randevu 600 ₺ yazılır. → Yedek seçenek olarak price/duration'ı eşleşeni seç ya da ikisini de aynı seçenekten yaz.
- [ ] **"Görüşmede/başlangıç" fiyatlı randevu kesin tutar girilmeden tamamlanıyor → ciro 0.** `web/features/services/service-pricing.ts:64-77` (completed'ı kesin sayıyor), `business-assistant.tsx:378`, `checkout-tab.tsx`, `appointment-repository.ts:133-137` (`servicePriceFinal: true` yazmıyor). → `needsFinalPrice = type !== "fixed" && !servicePriceFinal`; tamamlarken kesin tutar sor.
- [ ] **Sağlık verisi açık rızasız toplanıyor (KVKK md.6).** "Alerji / hassasiyet" şablonu (`web/features/booking-fields/templates.ts:22`, 36-47) spa, güzellik, kuaför ve sağlık kategorilerine öneriliyor. KVKK metni ise "sağlık verisi yazmayın" diyor. → Şablonu kaldır ya da alan doldurulunca ayrı açık rıza kutusu göster (zamanı ve sürümü randevuya yaz).

## P1 — Bu hafta / büyümeden önce

### Güvenlik
- [ ] E-posta doğrulama koduna kaba kuvvet/yarış saldırısı (`index.ts:7567-7615`): deneme sayacı transaction dışında, kod düz metin, IP limiti yok. → Transaction + hash + `consumeSecurityLimit`.
- [ ] `sendBusinessPush` (`index.ts:2908-2935`): onaysız/askıdaki mağaza da sınırsız push atabiliyor; alıcılar istemcinin yazabildiği `customers.userId`'den geliyor. → Alıcılar yalnız `appointments.customerId`; isPublished/askı/paket kontrolü + günlük limit.
- [ ] `createStaffMember` / `linkStaffAccount` (`index.ts:3908-3985`): istenen e-postaya hesap açıyor, sınırsız davet maili gönderiyor, `linkedUid` herkese açık (e-posta→uid öğrenilir). → Davet+kabul akışı, limit, `linkedUid`'i herkese açık belgeden çıkar.
- [ ] `requestSubscriptionPurchase` (`index.ts:1892-1926`): tutar 0 çıkarsa (ör. `yearlyPrice: 0`) paketi ödemesiz ve tekrar tekrar açıyor. → Tutar 0 ise reddet.
- [ ] `joinWaitlist` (`index.ts:4117`) ve `submitPublicSupportRequest` (`:3355`, anahtar `ip|phone` değiştirilerek aşılıyor): spam ve bildirim seli. → IP + işletme başına limit.
- [ ] `isPlatformAdminAccount` (`index.ts:342-345`) sabit admin e-postasında `email_verified` kontrol etmiyor (rules ediyor). → `token.email_verified === true`.

### Doğruluk
- [ ] Memnuniyet anketi eski randevulara da gidiyor (toplu "tamamlandı" yapılınca): `index.ts:6488-6497`. → `endAt < now-24sa` ise planlama.
- [ ] Anket `whatsappFirst=false` ayarını yok sayıyor (`index.ts:6488-6510`).
- [ ] WhatsApp durumları geri gidebiliyor (read → delivered): `index.ts:6187`. → Durum sırası (accepted<sent<delivered<read, failed son).
- [ ] Gelen kutusu otomatik cevabı arka arkaya iki mesajda iki kez gidebiliyor (`lastAutoReplyAt` transaction dışında okunuyor). → Transaction içinde `autoReplyClaimAt`.
- [ ] Gelen kutusu eşleştirmesi sırasız `limit(20)` ile yanlış randevuyu seçebilir (`index.ts:~6308`). → `orderBy("startAt","desc")` + indeks.
- [ ] Wallet/ICS kartında ek hizmetler iki kez sayılıyor (`index.ts:5160-5164`; 500+200 → 900 ₺).
- [ ] "Görüşmede" fiyatlı hizmetin tahmini fiyatı Instagram paylaşım görselinde görünüyor (`web/features/share/instagram-share-domain.ts:136`); hızlı "Görüşmede" seçince eski fiyat silinmiyor (`hizmetler/page.tsx:278-283`).
- [ ] Hatırlatma kuyruğu yavaş: dakikada ~30-60 SMS (`sendAppointmentSmsJobs` `limit(100)`, sıralı, 60 sn). Geç kalan "1 saat kaldı" SMS'i randevu başladıktan sonra da gidiyor (`processAppointmentSmsJob` `startAt < now` kontrolü yok). → Geç kalan işi sil; timeout 540 + paralel gruplar.
- [ ] SMS/WhatsApp çift gönderim riski: zaman aşımında kira biter, yeniden gönderilir; WhatsApp kabul edilip kayıt hatası olursa SMS de gider (`index.ts:6097-6155`, `6578-6677`).
- [ ] `appointmentAutomationUpdated` idempotent değil (`index.ts:5420-5451`): olay tekrar teslim edilince iptal/taşıma SMS'i ve push iki kez gider.

### Maliyet (işletme sayısı arttıkça fatura)
- [ ] **Panel her açılışta işletmenin tüm randevu ve müşteri geçmişini okuyor** (`web/features/appointments/appointment-repository.ts:44-74`, `customer-repository.ts:8-12`). 1.000 işletmede ~1-2 bin $/ay. → Tarih aralığı + sayfalama; analitik için sunucu toplamları.
- [ ] **Keşfet her ziyaretçide tüm yayındaki işletmeleri okuyor** (`web/features/discovery/search-repository.ts:198-205`). → Facet'ler sunucuda önbellekli ya da tek bir özet belgesi.
- [ ] Randevu belgesine her teknik güncelleme (SMS durumu, teslim raporu) 3 tetikleyici çalıştırıyor (`liveQueueWaitAppointmentChanged`, `availabilityAppointmentChanged`, `appointmentAutomationUpdated`). → Yalnız `sms.*/push.*/followUp.*` değiştiyse hemen çık.
- [ ] `sendPlatformPush` / `getPlatformPushOperations` tüm cihazları sınırsız okuyor (`index.ts:2808, 2855`); 100 bin cihazda 60 sn'de yarıda kalır, tekrar denemede çift bildirim. → FCM topic'leri.
- [ ] Süper admin sayfaları tüm koleksiyonları istemciden okuyor; `super-admin/page.tsx:117` `count()` hatasında her işletmenin tüm randevularını okuyan bir yedek yol var (kaldır). `asistan/platform-assistant.tsx:110-116` tüm `users` koleksiyonunu okuyor.
- [ ] Herkese açık callable'larda IP limiti / `maxInstances` yok (`getAvailableDates` her çağrıda 42 günlük randevu okuyor); bot taraması fatura üretir.
- [ ] Platform analitiği: kimliksiz sınırsız yazım (`firestore.rules:198`) ve "son 30 gün" aslında son 2.500 olay. → GA4'e bırak ya da sunucu toplama + TTL.

### Yasal (metinlerde avukat onayı gerekir)
- [ ] **Hesap silme bazı verileri silmiyor**, sayfa ise "tamamı silinir" diyor (`deleteMyAccount` `index.ts:2651-2790`). Silinmeyenler: `businessAcquisitions`, `widgetTokens`, `whatsappConversations` + Storage medyası, `whatsappMessages`/`whatsappFollowUps`, asistan kayıtları, `surveyResponses`, `subscriptionPurchaseRequests`, müşteri tarafı feedback.
- [ ] Silme akışı, saklanması gereken kayıtları da siliyor (`subscriptions`, `platformAuditLogs`; VUK/5651). → Sil yerine anonimleştir.
- [ ] Yurt dışı aktarım ve sağlayıcılar adıyla yazılmamış (KVKK md.9). Kullanılanlar: Meta WhatsApp, Google Gemini, Firebase/GCP, FCM/reCAPTCHA, PayTR, Mutlucell, Nominatim, GA/GTM, Meta Pixel. → Sağlayıcı tablosu ekle; standart sözleşme + Kurul bildirimi.
- [ ] WhatsApp gelen kutusu aydınlatma metninde yok; saklama süresi yok. Eşleştirme müşterinin tüm işletmelerdeki randevu sayısını gösteriyor (amaç dışı). → Metne bölüm ekle, eşleştirmeyi son randevuyla sınırla (işletme ve randevu sayısını gösterme), 180 gün saklama.
- [ ] UTM/fbclid kaydı çerez onayından bağımsız tutuluyor (`web/features/attribution/attribution.ts`). → Pazarlama onayına bağla; çerez politikasına `sr_attribution` satırı.
- [ ] Anket + "Instagram'da takip edin" düğmesi ticari ileti sayılabilir (6563/İYS). Müşteri bazında ret (DUR/STOP) yok. → Instagram düğmesini kaldır ya da İYS onayına bağla; `messagingOptOuts/{phone}`; ankete "DUR yazın" satırı ekle.
- [ ] Mesafeli sözleşme / ön bilgilendirme ödeme sonrası e-postayla (kalıcı veri saklayıcısı) gönderilmiyor; ödeme ekranında dolu ön bilgilendirme yok; `termsVersion` istemciden geliyor ve doğrulanmıyor (`index.ts:2013, 2062`).
- [ ] Gemini kullanımı (çeviri + asistan) aydınlatmada yok. Ücretli katmanda olduğunu doğrula (ücretsiz katmanda veri eğitimde kullanılabilir).
- [ ] Çerez politikası gerçek çerezleri listelemiyor (`_ga`, `_fbp`, onay çerezi, `sr_attribution`, reCAPTCHA).

## P2 — Önemli ama acil değil

- [ ] Performans: her sayfaya ~1 MB CSS (`app/globals.css` 30 bin satır) ve statik sayfalarda bile ~440 KB gzip JS (Firebase sağlayıcıları `components/layout/app-providers.tsx` ile her sayfada). → Sağlayıcıları ilgili layout'lara taşı, CSS'i modüllere böl.
- [ ] SEO: Firestore kısa süreli hata verirse `getSeoIndex` `[]` döndürüp önbelleğe yazıyor (`lib/seo/seo-data.ts:90-96`); sitemap boş, şehir sayfaları 404 kalıyor. → Hata fırlat, ISR eski sayfayı korusun.
- [ ] SEO dizini 1.000 işletmeyle sınırlı (`seo-data.ts:82`); sitemap'te `/en` adresleri ve `en-GB` alternatifleri yok (`app/sitemap.ts:25-30`).
- [ ] İngilizce sözlüğün tamamı (~183 KB gzip) her EN sayfada hydration'ı bekletiyor (`i18n/client.tsx:29`).
- [ ] Randevu sayfası ve hesabımda saatler cihazın saat diliminde gösteriliyor (`randevu/[publicToken]/page.tsx:130`, `hesabim/page.tsx:737`). → `timeZone: "Europe/Istanbul"` (işletmenin dilimi).
- [ ] İngilizce panelde Türkçe kalanlar: "Ek bilgiler" bloğu (`features/booking-fields/appointment-custom-fields.tsx:12,18`), hizmet şablon kütüphanesi (`hizmetler/template-library-sheet.tsx:79,82`), bazı `aria-label`'lar.
- [ ] Error boundary'ler Next 16'da `reset` yerine `retry` kullanmalı (`app/[lang]/error.tsx`, `app/global-error.tsx`); dashboard'a ayrı `error.tsx` ekle.
- [ ] Güvenlik başlıkları: HSTS ve CSP yok (`web/next.config.ts`). Service worker yol kontrolü `/\evil.com` biçimini geçiriyor (`app/firebase-messaging-sw.js/route.ts`); `new URL` + origin karşılaştırması yap.
- [ ] Herkese açık işletme belgesinde iç alanlar: `adminNote`, `onboardingGoals`, `dailyAppointmentVolume`, `ownerUid`… → Ayrı özel belgeye taşı. Yorumlarda `customerId` ve tam ad açık.
- [ ] Storage: yorum görseli klasörüne randevusuz sınırsız yükleme; `image/svg+xml` kabul ediliyor (`storage.rules:12, 48-51`).
- [ ] Destek mesajında `senderRole` taklit edilebiliyor (`firestore.rules:383-392`); işletme bildirimlerini her üye sahte "system" olarak yazabiliyor (`:619-622`).
- [ ] Şifre sıfırlama açık oturumları kapatmıyor (`index.ts:7793`, `revokeRefreshTokens`).
- [ ] Reklam paneli: `fbclid` tek başına "ücretli" sayılıyor (organik tıklamalar şişiriyor); Meta verisinde sayfalama yok (>100 kampanya / >500 reklam eksik); arşivlenen reklamlar ağaçta görünmüyor.
- [ ] Çeviri: model bazı alanları döndürmezse yeniden denenmiyor (`index.ts:7929-7940`); toplu güncelleme aynı 60 belgede takılabiliyor ve her çağrıda tüm hizmetleri okuyor (`:7962`); işletme başına Gemini kotası yok.
- [ ] Bekleme listesi, müsaitlik uyarısı ve canlı sıra hizmet seçeneğini (variant) bilmiyor; panelden randevu düzenlemek çalışana özel fiyatı sıfırlıyor (`index.ts:4583`).
- [ ] Süper admin raporları sessizce kesiliyor: WhatsApp istatistikleri `limit(2000)`, SMS kullanımı `limit(1000)`, Meta paneli `limit(2000)`.
- [ ] Memnuniyet anketi kapasitesi dakikada 20; Mutlucell teslim raporu günde ~9,6 bin.
- [ ] `deleteBusinessPermanently` büyük işletmede 120 sn'de yarım kalabilir (`index.ts:2396-2462`).
- [ ] Graph API v21.0 sabit yazılmış (`whatsapp-domain.ts:40`, reklam modülü); Meta emeklilik tarihini kontrol et.
- [ ] OTP IP limiti (saatte 20) mobil operatörlerin ortak IP'lerinde gerçek kullanıcıları engelleyebilir.

## P3 — Temizlik

- [ ] Ölü kod: `components/storefront/` altında kullanılmayan 7 dosya, `constants/roles.ts` etiketleri, 3 ölü i18n anahtarı.
- [ ] `scripts/check-internal-links.mjs` neredeyse her yolu geçerli sayıyor (kör).
- [ ] robots.txt `/en/...` yollarını kapatmıyor; token sayfalarında Disallow yerine yalnız noindex kullan.
- [ ] PWA: işletme service worker'ı `/en/dashboard`'u kapsamıyor; çevrimdışı sayfa yalnız Türkçe; push tıklaması dil öneksiz yola gidiyor.
- [ ] Randevu özetinde adres boşsa ", , Fethiye" yazıyor (`isletme/[slug]/randevu/page.tsx:174`).
- [ ] Bakım modunu geçebilen yönetici e-postası koda sabit yazılmış (`components/layout/maintenance-gate.tsx:9`).
- [ ] Her sayfada 2 ayrı `platformSettings` okuması (bakım + duyuru).
- [ ] `README kopyası.md` repoda; Node 22 desteği Nisan 2027'de bitiyor (Node 24'e geçiş).
- [ ] Widget özeti 60 kayıtla kırpılmış listeden hesaplanıyor; `widgetTokens` süresiz.
- [ ] Herkese açık `/fiyatlar` sayfasında "KDV dahil" ibaresi yok.
- [ ] Çocuk verisi: yaş/veli beyanı yok; "doğum günü" alanının amacı belirtilmemiş.

---

## Konsolda elle yapılacaklar (kodla değil)

1. **Firestore TTL politikaları** (alan `expiresAt`): `smsOperationsLogs`, `whatsappMessages`, `triggerReceipts`, `securityRateLimits`, `liveQueueNotificationEvents`, `availabilityNotificationEvents`, `lastMinuteOpenings`, `appointmentPushJobs`, `whatsappFollowUps`, `automationRuns` (CG), `bookingDayLocks` (CG), `verificationCodes`, `emailVerificationCodes`.
   - Önce koda `expiresAt` eklenmesi gerekenler: `whatsappConversations/messages`, `platformAnalyticsEvents`, `businesses/*/notifications`, `mail`, `notificationLogs`, `assistantAuditLogs`, `smsDeliveryChecks`.
2. **Storage yaşam döngüsü:** `private/whatsapp-inbox/` için 180 gün sonra silme.
3. **Yedek:** Firestore PITR (7 gün) aç + günlük/haftalık zamanlanmış yedek.
4. **Bütçe uyarısı:** Cloud Billing'de %50 / %90 / %100 eşikleri + Firestore okuma sayısı alarmı.
5. **İzleme:** fonksiyon hata ve zaman aşımı alarmları (`sendAppointmentSmsJobs`, `whatsappWebhook`, `checkMutlucellDeliveryReports`), Error Reporting e-postası, seninrandevun.com ve webhook için uptime kontrolü.
6. **Meta:** `sr_islem_sonrasi` şablonunun kategorisini doğrula (Utility olmalı). Numaranın mesajlaşma katmanını ve kalite puanını izle. GTM konteynerindeki etiketlerin onay ayarlarını kontrol et.
7. **Gemini:** ücretli katmanda olduğunu doğrula.
8. **Avukat:** KVKK aydınlatma (sağlayıcı tablosu, gelen kutusu, Gemini, UTM), çerez envanteri, yıllık abonelikte cayma hakkı istisnası, veri işleme eki (DPA).
