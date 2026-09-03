"use client";

import Image from "next/image";
import { useMemo, useState, type CSSProperties } from "react";
import { ArrowRight, BadgeCheck, BookOpenCheck, CalendarCheck, ChartNoAxesCombined, CircleHelp, Clock3, CreditCard, Headphones, Heart, LifeBuoy, MessagesSquare, Search, Settings2, ShieldCheck, Store, UsersRound, WalletCards, WandSparkles, type LucideIcon } from "lucide-react";
import { SupportRequestModal } from "@/components/support/support-request-modal";

type HelpMode = "customer" | "business";
type HelpTopic = { icon: LucideIcon; title: string; description: string; articles: string[] };

const customerTopics: HelpTopic[] = [
  { icon: Search, title: "Mağaza keşfetme", description: "Doğru hizmeti, şehri ve işletmeyi daha hızlı bulun.", articles: ["Arama ve filtreleri kullanma", "İşletme profilini değerlendirme", "Yorumlar ve puanlar"] },
  { icon: CalendarCheck, title: "Randevu oluşturma", description: "Hizmet, çalışan ve müsait saati güvenle seçin.", articles: ["İlk randevumu nasıl alırım?", "Doğru çalışanı seçme", "Randevu onayı nasıl gelir?"] },
  { icon: Clock3, title: "Değişiklik ve iptal", description: "Yaklaşan randevularınızı tek yerden yönetin.", articles: ["Randevu tarihini değiştirme", "Randevu iptal koşulları", "Gecikme durumunda ne yapmalıyım?"] },
  { icon: Heart, title: "Hesabım ve favoriler", description: "Geçmişinizi, favorilerinizi ve profilinizi düzenleyin.", articles: ["Müşteri hesabı oluşturma", "Favori mağaza ekleme", "Hesap bilgilerimi güncelleme"] },
  { icon: WalletCards, title: "Fiyat ve ödeme", description: "Fiyatların ve işletme ödeme seçeneklerinin işleyişi.", articles: ["Hizmet fiyatları nerede görünür?", "Ödeme işletmeye nasıl yapılır?", "İade için kiminle görüşmeliyim?"] },
  { icon: ShieldCheck, title: "Güvenlik ve gizlilik", description: "Hesabınız ve kişisel verileriniz için yardım alın.", articles: ["Şifremi sıfırlama", "Kişisel verilerim nasıl korunur?", "Şüpheli bir durumu bildirme"] },
];

const businessTopics: HelpTopic[] = [
  { icon: Store, title: "Kurulum ve mağaza", description: "Profilinizi eksiksiz kurup keşfete hazır hâle getirin.", articles: ["İşletme çalışma alanını açma", "Logo, kapak ve konum ekleme", "Mağazayı yayına alma kontrolü"] },
  { icon: CalendarCheck, title: "Takvim ve randevular", description: "Günlük akışı, durumları ve müsaitliği yönetin.", articles: ["Takvim görünümünü kullanma", "Manuel randevu ekleme", "İptal ve gelmedi durumları"] },
  { icon: UsersRound, title: "Ekip ve hizmetler", description: "Çalışan, yetki, süre ve fiyat düzeninizi kurun.", articles: ["Çalışan ve rol ekleme", "Hizmet kataloğu oluşturma", "Çalışana hizmet atama"] },
  { icon: MessagesSquare, title: "Müşteri ve iletişim", description: "CRM kayıtlarını ve otomatik iletişimi güçlendirin.", articles: ["Müşteri kartlarını yönetme", "Hatırlatma akışları", "Yorumlara profesyonel yanıt verme"] },
  { icon: CreditCard, title: "Plan ve abonelik", description: "Ücretsiz dönem, fatura ve abonelik detaylarını öğrenin.", articles: ["İlk yıl ücretsiz kampanyası nasıl çalışır?", "Abonelik ve ödeme adımları", "Plan durumunu görüntüleme"] },
  { icon: ChartNoAxesCombined, title: "Analitik ve büyüme", description: "Raporları okuyup daha güçlü kararlar alın.", articles: ["Doluluk oranını yorumlama", "Gelir ve hizmet performansı", "Müşteri sadakati metrikleri"] },
];

export function HelpCenter({ mode }: { mode: HelpMode }) {
  const [query, setQuery] = useState("");
  const business = mode === "business";
  const topics = business ? businessTopics : customerTopics;
  const normalized = query.trim().toLocaleLowerCase("tr-TR");
  const filtered = useMemo(() => topics.filter((topic) => !normalized || `${topic.title} ${topic.description} ${topic.articles.join(" ")}`.toLocaleLowerCase("tr-TR").includes(normalized)), [normalized, topics]);

  return <main className={`help-hub ${business ? "help-hub--business" : "help-hub--customer"}`}>
    <section className="help-hero">
      <div className="help-hero-copy">
        <span><LifeBuoy size={14} /> {business ? "İŞLETME YARDIM MERKEZİ" : "MÜŞTERİ YARDIM MERKEZİ"}</span>
        <h1>{business ? <>İşletmeniz için<br/><em>net cevaplar.</em></> : <>Randevunuz için<br/><em>yanınızdayız.</em></>}</h1>
        <p>{business ? "Kurulumdan günlük operasyona kadar ekibinizin ihtiyaç duyduğu rehberler, pratik çözümler ve destek kanalları." : "Mağaza keşfetmeden randevunuzu yönetmeye kadar tüm sorularınızın sade ve güvenilir cevapları."}</p>
        <label className="help-search"><Search size={20}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={business ? "Takvim, çalışan, abonelik veya konu ara…" : "Randevu, iptal, ödeme veya konu ara…"}/>{query && <button type="button" onClick={() => setQuery("")} aria-label="Aramayı temizle">×</button>}</label>
        <div className="help-popular"><b>POPÜLER:</b>{(business ? ["Mağazayı yayına", "Çalışan", "Takvim"] : ["Randevu", "İptal", "Şifre"]).map(item => <button type="button" key={item} onClick={() => setQuery(item)}>{item}</button>)}</div>
      </div>
      <div className="help-hero-art"><Image src={business ? "/images/help-business.png" : "/images/help-customer.png"} alt={business ? "İşletme yönetimi yardım araçları" : "Müşteri randevu yardım araçları"} fill priority sizes="(max-width: 900px) 100vw, 44vw"/><div><BadgeCheck size={17}/><span><b>Adım adım rehberler</b><small>Hızlı · anlaşılır · güncel</small></span></div></div>
    </section>

    <section className="help-topics" aria-live="polite">
      <div className="help-section-heading"><div><span>KONUYA GÖRE KEŞFET</span><h2>{normalized ? `${filtered.length} sonuç bulundu` : "Nereden başlamak istersiniz?"}</h2></div><p>{business ? "Operasyonun her aşaması için kısa ve uygulanabilir içerikler." : "İhtiyacınız olan cevaba birkaç saniyede ulaşın."}</p></div>
      {filtered.length ? <div className="help-topic-grid">{filtered.map(({icon:Icon,title,description,articles},index) => <article key={title} style={{"--help-i": index} as CSSProperties}><div className="help-topic-icon"><Icon size={22}/></div><h3>{title}</h3><p>{description}</p><ul>{articles.map(article => <li key={article}><a href={`#${slug(article)}`}>{article}<ArrowRight size={12}/></a></li>)}</ul></article>)}</div> : <div className="help-empty"><CircleHelp size={36}/><h3>Bu aramayla eşleşen konu bulamadık.</h3><p>Daha kısa bir ifade deneyin veya destek ekibimize ulaşın.</p><button type="button" onClick={() => setQuery("")}>Tüm konuları göster</button></div>}
    </section>

    <section className="help-guides">
      <div className="help-section-heading"><div><span>ADIM ADIM ÇÖZÜMLER</span><h2>En çok ihtiyaç duyulan rehberler.</h2></div><p>Başlığa dokunun; kısa çözüm adımlarını aynı sayfada görün.</p></div>
      <div className="help-guide-list">{topics.flatMap(topic => topic.articles.map(article => <details key={article} id={slug(article)}><summary><span>{topic.title}</span><b>{article}</b><i>+</i></summary><div><p>{guideText(business, topic.title, article)}</p><small>Bu adımlardan sonra sorun devam ederse sayfanın altındaki destek kanalını kullanabilirsiniz.</small></div></details>))}</div>
    </section>

    <section className="help-steps">
      <div className="help-step-art"><Image src={business ? "/images/help-business.png" : "/images/help-customer.png"} alt="" fill sizes="(max-width: 800px) 100vw, 40vw"/></div>
      <div className="help-step-copy"><span>HIZLI BAŞLANGIÇ</span><h2>{business ? "Çalışma alanınızı üç adımda hazırlayın." : "İlk randevunuzu üç adımda oluşturun."}</h2><ol>{(business ? [["01","Mağaza profilini tamamlayın"],["02","Hizmet, ekip ve saatleri ekleyin"],["03","Bağlantınızı yayınlayıp randevu alın"]] : [["01","Aradığınız hizmeti keşfedin"],["02","İşletme, çalışan ve saati seçin"],["03","Hesabınızdan randevunuzu takip edin"]]).map(([no,text]) => <li key={no}><b>{no}</b><span>{text}</span><BookOpenCheck size={17}/></li>)}</ol></div>
    </section>

    <section className="help-contact"><div><Headphones size={27}/><span><b>Aradığınız cevabı bulamadınız mı?</b><small>{business ? "Giriş yapmadan mesaj bırakın; ekibimiz talebinizi super-admin ekranından takip etsin." : "Destek ekibimiz randevu ve hesap sorularınız için burada."}</small></span></div><SupportRequestModal audience={business ? "business" : "customer"} triggerLabel={business ? "Destek talebi oluştur" : "Bize mesaj gönder"} triggerClassName="help-contact-button"/><div className="help-contact-meta"><span><WandSparkles size={13}/> Hızlı dönüş</span><span><Settings2 size={13}/> Uzman yönlendirmesi</span></div></section>
  </main>;
}

function slug(value: string) { return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

function guideText(business: boolean, topic: string, article: string) {
  if (business) return `${article} için işletme panelinizde ilgili ${topic.toLocaleLowerCase("tr-TR")} alanını açın. Bilgileri sırayla tamamlayın, önizlemede doğrulayın ve değişiklikleri kaydedin. Yayındaki mağazanızı ayrıca müşteri görünümünden kontrol edin.`;
  return `${article} için hesabınızdan veya mağaza profilinden ilgili ${topic.toLocaleLowerCase("tr-TR")} alanını açın. Ekrandaki seçenekleri kontrol ederek işlemi tamamlayın; randevu durumunun Hesabım ekranında güncellendiğini doğrulayın.`;
}
