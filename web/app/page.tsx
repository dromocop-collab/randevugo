import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  const features = [
    "Online randevu",
    "Calisan yonetimi",
    "Hizmet yonetimi",
    "Otomatik hatirlatma",
    "Musteri yonetimi",
    "Raporlama",
    "Coklu sube",
    "Odeme ve kapora altyapisi",
  ];

  const sectors = [
    "Kuafor",
    "Berber",
    "Guzellik merkezi",
    "Nail studio",
    "Spor/PT",
    "Danismanlik",
    "Veteriner",
    "Servis isletmeleri",
  ];

  const kpis = [
    { label: "Aylik online rezervasyon", value: "+148K" },
    { label: "No-show azalma ortalamasi", value: "-31%" },
    { label: "Musteri geri donus artisi", value: "+42%" },
    { label: "Isletme memnuniyet puani", value: "4.9/5" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="orb orb-left" />
      <div className="orb orb-right" />
      <div className="orb orb-bottom" />

      <header className="mx-auto mt-3 flex w-full max-w-7xl items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-4 shadow-xl shadow-[var(--shadow-soft)] backdrop-blur-xl lg:px-6">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight text-[var(--text-1)]">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-white shadow-md">
            R
          </span>
          RandevuGo
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/giris" className="rounded-xl px-4 py-2 text-sm text-[var(--text-2)] hover:bg-white/50">
            Giris Yap
          </Link>
          <Link href="/kayit" className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/30">
            Ucretsiz Basla
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-16 px-4 pb-20 pt-8 lg:px-6 lg:pt-12">
        <section className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="stagger-in">
            <p className="inline-block rounded-full border border-sky-200/70 bg-sky-50/80 px-3 py-1 text-xs tracking-[0.12em] text-sky-700">
              Modern Randevu SaaS
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight tracking-tight text-[var(--text-1)] lg:text-6xl">
              Isletmenizin randevularini tek panelden yonetin.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-[var(--text-2)]">
              RandevuGo ile ekip, hizmet, takvim, CRM ve analiz surecini tek cati altinda toplayin.
              Daha duzenli operasyon, daha fazla tekrar eden musteri.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/kayit">
                <Button className="h-11 px-6 text-sm">Ucretsiz Basla</Button>
              </Link>
              <Link href="/giris">
                <Button variant="secondary" className="h-11 px-6 text-sm">Canli Panele Gir</Button>
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {kpis.map((item, index) => (
                <div
                  key={item.label}
                  className="stagger-item rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 shadow-lg shadow-[var(--shadow-soft)] backdrop-blur-xl"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-3)]">{item.label}</p>
                  <p className="mt-1 text-2xl font-bold text-[var(--text-1)]">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <Card className="glass relative overflow-hidden" title="Dashboard Onizleme" description="Gercek zamanli operasyon paneli">
            <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-cyan-300/30 blur-2xl" />
            <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-blue-400/20 blur-2xl" />
            <div className="relative grid gap-3 sm:grid-cols-2">
              <DashboardMetric label="Bugunku randevular" value="42" trend="+18%" />
              <DashboardMetric label="Bekleyen onaylar" value="7" trend="Canli" />
              <DashboardMetric label="Gunluk gelir" value="19.240 TL" trend="+22%" />
              <DashboardMetric label="Yeni musteriler" value="16" trend="Bu hafta" />
              <DashboardMetric label="No-show riski" value="Dusuk" trend="AI" />
              <DashboardMetric label="Maksimum doluluk" value="%91" trend="Cuma" />
            </div>
          </Card>
        </section>

        <section className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-3xl font-semibold tracking-tight">Ozellikler</h2>
            <p className="hidden text-sm text-[var(--text-3)] md:block">Kurulumdan operasyona tum randevu akisi tek panelde.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((item, index) => (
              <Card key={item} className="stagger-item hover:-translate-y-1 transition-transform duration-300" >
                <div style={{ animationDelay: `${index * 70}ms` }}>
                  <p className="font-medium text-[var(--text-1)]">{item}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="marquee-wrap rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] py-3 backdrop-blur-xl">
          <div className="marquee-track">
            {[
              "Cloud Functions ile cift rezervasyon korumasi",
              "Isletme bazli veri izolasyonu",
              "SMS / E-posta / WhatsApp hazir altyapi",
              "App Hosting uyumlu deploy",
              "Dark-Light mode ve mobil nav",
            ].map((item) => (
              <span key={item} className="mx-6 text-sm font-medium text-[var(--text-2)]">{item}</span>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card title="Nasil Calisir" description="Kurulum ve kullanim 3 adimda tamamlanir.">
            <ol className="space-y-2 text-sm text-[var(--text-2)]">
              <li>1. Isletmeni kaydet ve ayarlarini tamamla.</li>
              <li>2. Hizmetleri, calisanlari ve saatleri tanimla.</li>
              <li>3. Ozel sayfani paylas ve randevu almaya basla.</li>
            </ol>
          </Card>
          <Card title="Sektorler" description="Farkli is modelleri icin optimize edildi.">
            <ul className="grid grid-cols-2 gap-2 text-sm text-[var(--text-2)]">
              {sectors.map((item) => (
                <li key={item} className="rounded-lg bg-[var(--surface-1)] p-2">
                  {item}
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Paketler" description="Isletme buyuklugune gore esnek planlar.">
            <ul className="space-y-2 text-sm text-[var(--text-2)]">
              <li>FREE: 1 calisan, temel ozellikler.</li>
              <li>PRO: coklu calisan, sinirsiz randevu, raporlama.</li>
              <li>BUSINESS: coklu sube, API ve gelismis roller.</li>
            </ul>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card title="SSS" description="En sik sorulan sorular">
            <ul className="space-y-3 text-sm text-[var(--text-2)]">
              <li>Ucretsiz plan var mi? Evet, temel ozelliklerle baslayabilirsiniz.</li>
              <li>Public randevu sayfasi var mi? Evet, her isletmeye ozel slug verilir.</li>
              <li>Mobil uyumlu mu? Evet, panel ve rezervasyon akisi tamamen responsive.</li>
            </ul>
          </Card>
          <Card
            title="Hazir misiniz?"
            description="Panelinizi hemen aktif edin. Kurulumdan sonra dakikalar icinde canliya alin."
            className="relative overflow-hidden"
          >
            <div className="absolute -bottom-6 -right-8 h-24 w-24 rounded-full bg-cyan-300/40 blur-2xl" />
            <div className="relative flex flex-wrap gap-3">
              <Link href="/kayit">
                <Button>Ucretsiz Basla</Button>
              </Link>
              <Link href="/giris">
                <Button variant="secondary">Giris Yap</Button>
              </Link>
            </div>
          </Card>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] bg-[var(--surface-2)]">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-[var(--text-3)] lg:px-6">
          <p>RandevuGo © 2026</p>
          <p>Guvenlik, performans ve olceklenebilirlik odakli SaaS altyapisi.</p>
        </div>
      </footer>
    </div>
  );
}

function DashboardMetric({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 shadow-sm">
      <p className="text-xs text-[var(--text-3)]">{label}</p>
      <p className="mt-2 text-xl font-semibold text-[var(--text-1)]">{value}</p>
      <p className="mt-1 text-xs text-cyan-700">{trend}</p>
    </div>
  );
}
