import type { Metadata } from "next";
import { ContentPage } from "@/components/marketing/content-page";
export const metadata: Metadata = { title:"Özellikler", description:"Online randevu, akıllı takvim, müşteri CRM, çalışan yönetimi, raporlama ve dijital mağaza özelliklerini keşfedin.", alternates:{canonical:"/ozellikler"} };
export default function Page(){return <ContentPage eyebrow="TEK SİSTEM, TÜM İŞLETME" title="Randevudan büyümeye her şey tek yerde." intro="SeninRandevun yalnızca saat doldurmaz; ekibinizin zamanını, müşteri deneyimini ve işletmenizin büyümesini birlikte yönetir." sections={[
  {title:"Akıllı takvim ve müsaitlik",body:"Hizmet süresi, çalışan vardiyası, mola, izin ve mevcut randevuları birlikte hesaplayan canlı uygunluk motoru.",bullets:["Çakışma engelleme","Çalışan bazlı çalışma saatleri","İzin ve mola yönetimi","Günlük, haftalık ve aylık görünüm"]},
  {title:"Dijital mağaza ve online randevu",body:"Markanıza özel profiliniz; hizmetleri, fiyatları, çalışanları, yorumları ve gerçek müsait saatleri tek bağlantıda sunar.",bullets:["7/24 self-servis randevu","Mobil öncelikli deneyim","Paylaşılabilir mağaza linki","Keşfet görünürlüğü"]},
  {title:"Müşteri CRM ve sadakat",body:"Her müşterinin ziyaret geçmişini, notlarını, iletişim bilgilerini ve harcama davranışını anlaşılır bir profilde tutun.",bullets:["Otomatik müşteri profili","Ziyaret ve iptal geçmişi","Müşteri notları","Segmentasyon altyapısı"]},
  {title:"Ekip ve hizmet yönetimi",body:"Çalışanlarınızın sunduğu hizmetleri, fiyatları ve çalışma düzenini ayrı ayrı yönetin.",bullets:["250 çalışana kadar destek","Hizmet bazlı yetkinlik","Performans görünümü","Çoklu şube altyapısı"]},
  {title:"Analitik ve raporlama",body:"Doluluk, gelir, randevu kaynağı, iptal ve müşteri trendlerini aksiyona dönüştüren özetlerle izleyin.",bullets:["Canlı KPI kartları","Haftalık doluluk grafiği","Popüler hizmetler","Müşteri geri dönüş oranı"]},
  {title:"Hatırlatma ve operasyon",body:"Randevu teyitleri ve bildirim altyapısıyla telefon trafiğini ve gelmeyen müşteri oranını azaltın.",bullets:["Otomatik onay akışı","SMS ve e-posta altyapısı","Randevu durumu takibi","Destek merkezi"]}
]}/>}
