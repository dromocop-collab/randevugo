import Image from "next/image";
import { Check, LockKeyhole, ShieldCheck } from "lucide-react";

type BrandPageLoaderProps = {
  title?: string;
  label?: string;
  eyebrow?: string;
  securityMode?: boolean;
};

export function BrandPageLoader({
  title = "Her şey sizin için hazırlanıyor",
  label = "Deneyiminiz birkaç saniye içinde hazır olacak.",
  eyebrow = "SENİNRANDEVUN DENEYİMİ",
  securityMode = false,
}: BrandPageLoaderProps) {
  return (
    <div className={`brand-page-loader${securityMode ? " is-security" : ""}`} role="status" aria-live="polite">
      <div className="brand-loader-aurora" aria-hidden="true"><i/><i/><i/></div>
      <div className="brand-loader-grid" aria-hidden="true" />
      <section className="brand-loader-card">
        <div className="brand-loader-status"><span/><LockKeyhole size={13}/>{eyebrow}</div>
        <div className="brand-loader-mark" aria-hidden="true">
          <span className="brand-loader-ring ring-one"/><span className="brand-loader-ring ring-two"/>
          <span className="brand-loader-orbit-dot dot-one"/><span className="brand-loader-orbit-dot dot-two"/>
          <span className="brand-loader-logo"><Image src="/logo.png" alt="" width={72} height={72} priority/></span>
        </div>
        <strong className="brand-loader-wordmark">Senin<span>Randevun</span></strong>
        <div className="brand-loader-copy"><h1>{title}</h1><p>{label}</p></div>
        <div className="brand-loader-track" aria-hidden="true"><i/></div>
        {securityMode ? (
          <div className="brand-loader-checks" aria-hidden="true">
            <span className="is-complete"><i><Check size={11}/></i>Oturum</span>
            <span className="is-active"><i><ShieldCheck size={11}/></i>Yetki</span>
            <span><i/>Panel</span>
          </div>
        ) : null}
        <div className="brand-loader-trust"><ShieldCheck size={14}/> Bilgileriniz güvenli bağlantıyla korunuyor</div>
      </section>
      <span className="sr-only">Yükleniyor</span>
    </div>
  );
}
