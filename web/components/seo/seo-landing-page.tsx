import Link from "next/link";

export interface SeoLandingPageProps {
  pathname: string;
  eyebrow: string;
  title: string;
  description: string;
  category?: string;
  benefits: readonly string[];
  steps: readonly string[];
  faq: readonly { question: string; answer: string }[];
  relatedLinks: readonly { href: string; label: string }[];
}

export function SeoLandingPage({
  pathname,
  eyebrow,
  title,
  description,
  category,
  benefits,
  steps,
  faq,
  relatedLinks,
}: SeoLandingPageProps) {
  const siteUrl = "https://seninrandevun.com";
  const pageUrl = `${siteUrl}${pathname}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        url: pageUrl,
        name: title,
        description,
        inLanguage: "tr-TR",
        isPartOf: { "@type": "WebSite", name: "SeninRandevun", url: siteUrl },
      },
      {
        "@type": "Service",
        name: title,
        serviceType: "Online randevu hizmeti",
        provider: { "@type": "Organization", name: "SeninRandevun", url: siteUrl },
        areaServed: { "@type": "Country", name: "Türkiye" },
        url: pageUrl,
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };

  return (
    <main className="seo-landing min-h-screen bg-[var(--bg-1)] text-[var(--text-1)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="border-b border-[var(--border)]/50 bg-[var(--bg-1)]/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            Senin<span className="text-[var(--accent)]">Randevun</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/kesfet" className="rounded-lg px-3 py-2 text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text-1)]">
              İşletme Keşfet
            </Link>
            <Link href="/isletmeler/kayit" className="rounded-lg bg-[var(--accent)] px-3 py-2 font-bold text-white hover:brightness-110">
              İşletmeni Başlat
            </Link>
          </nav>
        </div>
      </header>

      <section className="seo-hero relative overflow-hidden border-b border-[var(--border)]/40">
        <span className="seo-orb seo-orb-one" />
        <span className="seo-orb seo-orb-two" />
        <div className="seo-hero-grid absolute inset-0" />
        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center sm:py-28 lg:px-8">
          <p className="seo-reveal seo-reveal-delay-1 text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent)]">{eyebrow}</p>
          <h1 className="seo-reveal seo-reveal-delay-2 mx-auto mt-5 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">{title}</h1>
          <p className="seo-reveal seo-reveal-delay-3 mx-auto mt-6 max-w-2xl text-lg leading-8 text-[var(--text-2)]">{description}</p>
          <div className="seo-reveal seo-reveal-delay-4 mt-9 flex flex-wrap justify-center gap-3">
            <Link href={category ? `/kesfet?category=${category}` : "/kesfet"} className="seo-primary-cta rounded-xl bg-[var(--accent)] px-6 py-3 font-bold text-white shadow-lg shadow-sky-500/20 hover:brightness-110">
              Randevu Al
            </Link>
            <Link href="/fiyatlar" className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-6 py-3 font-bold text-[var(--text-1)] hover:bg-[var(--surface-2)]">
              İşletmeler İçin Çözüm
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {benefits.map((benefit, index) => (
            <article key={benefit} className={`seo-benefit seo-reveal-delay-${index + 1} border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-sm`}>
              <span className="seo-benefit-number text-sm font-black text-[var(--accent)]">0{index + 1}</span>
              <p className="mt-4 text-base font-semibold leading-7">{benefit}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--border)]/50 bg-[var(--surface-2)]/40">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Nasıl çalışır?</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight">Randevunuzu birkaç adımda oluşturun</h2>
          </div>
          <ol className="space-y-5">
            {steps.map((step, index) => (
              <li key={step} className="seo-step flex gap-4 border-b border-[var(--border)]/60 pb-5 last:border-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-black text-white">{index + 1}</span>
                <p className="leading-7 text-[var(--text-2)]">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 lg:px-8">
        <h2 className="text-3xl font-black tracking-tight">Sık sorulan sorular</h2>
        <div className="mt-8 divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {faq.map((item) => (
            <details key={item.question} className="seo-faq group py-5">
              <summary className="cursor-pointer list-none font-bold text-[var(--text-1)] marker:hidden">{item.question}</summary>
              <p className="mt-3 max-w-3xl leading-7 text-[var(--text-2)]">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="border-t border-[var(--border)]/50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-4 py-10 lg:px-8">
          <div>
            <h2 className="text-xl font-black">Daha hızlı randevu alın</h2>
            <p className="mt-1 text-sm text-[var(--text-2)]">Yakınınızdaki işletmeleri keşfedin ve uygun saati hemen seçin.</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm font-semibold">
            {relatedLinks.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-lg border border-[var(--border)] px-4 py-2 hover:border-[var(--accent)] hover:text-[var(--accent)]">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
