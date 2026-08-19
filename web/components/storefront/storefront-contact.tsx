"use client";

import type { ReactNode } from "react";
import { ArrowUpRight, AtSign, Camera, Globe2, Mail, MapPinned, MessageCircle, Navigation, Phone } from "lucide-react";
import type { Business } from "@/types/business";

function ContactItem({ href, icon, label, value, external = false }: { href: string; icon: ReactNode; label: string; value: string; external?: boolean }) {
  return <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className="storefront-contact-item"><i>{icon}</i><span><small>{label}</small><b>{value}</b></span><ArrowUpRight size={16}/></a>;
}

export function StorefrontContact({ business }: { business: Business }) {
  const social = business.socialMedia;
  const address = [business.address, business.district, business.city].filter(Boolean).join(", ");
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return <section className="storefront-contact-section">
    <header><span><MapPinned size={20}/></span><div><small>İLETİŞİM &amp; KONUM</small><h2>Bize kolayca ulaşın.</h2></div></header>
    <div className="storefront-contact-grid">
      {address && <ContactItem href={mapHref} icon={<Navigation size={19}/>} label="ADRES" value={address} external/>}
      {business.phone && <ContactItem href={`tel:${business.phone}`} icon={<Phone size={19}/>} label="TELEFON" value={business.phone}/>}
      {business.email && <ContactItem href={`mailto:${business.email}`} icon={<Mail size={19}/>} label="E-POSTA" value={business.email}/>}
      {business.website && <ContactItem href={business.website} icon={<Globe2 size={19}/>} label="WEB SİTESİ" value={business.website.replace(/^https?:\/\//, "")} external/>}
    </div>
    <a href={mapHref} target="_blank" rel="noopener noreferrer" className="storefront-map-cta"><span><MapPinned size={23}/><b>Yol tarifini aç</b><small>Google Haritalar ile mağazaya ulaşın</small></span><ArrowUpRight size={19}/></a>
    {social && Object.values(social).some(Boolean) && <div className="storefront-contact-socials"><small>SOSYAL HESAPLAR</small>{social.instagram && <a href={`https://instagram.com/${social.instagram}`} target="_blank" rel="noopener noreferrer"><Camera/> Instagram</a>}{social.facebook && <a href={social.facebook} target="_blank" rel="noopener noreferrer"><AtSign/> Facebook</a>}{social.whatsapp && <a href={`https://wa.me/${social.whatsapp}`} target="_blank" rel="noopener noreferrer"><MessageCircle/> WhatsApp</a>}</div>}
  </section>;
}
