import Image from "next/image";

export function BrandPageLoader({ label = "Deneyiminiz hazırlanıyor" }: { label?: string }) {
  return (
    <div className="brand-page-loader" role="status" aria-live="polite">
      <div className="brand-loader-aurora" aria-hidden="true"><i/><i/><i/></div>
      <div className="brand-loader-mark" aria-hidden="true">
        <span className="brand-loader-ring ring-one"/><span className="brand-loader-ring ring-two"/>
        <span className="brand-loader-logo"><Image src="/logo.png" alt="" width={72} height={72} priority/></span>
      </div>
      <strong>Senin<span>Randevun</span></strong>
      <p>{label}</p>
      <div className="brand-loader-track" aria-hidden="true"><i/></div>
      <span className="sr-only">Yükleniyor</span>
    </div>
  );
}
