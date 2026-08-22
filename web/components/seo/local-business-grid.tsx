import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, Star, Store } from "lucide-react";
import type { Business } from "@/types/business";

export function LocalBusinessGrid({ businesses }: { businesses: Business[] }) {
  if (businesses.length === 0) {
    return <div className="rounded-[26px] border border-dashed border-[#0b6b45]/20 bg-white/65 p-10 text-center"><Store className="mx-auto text-[#0b6b45]"/><h2 className="mt-4 text-xl font-bold">Yeni işletmeler hazırlanıyor</h2><p className="mt-2 text-sm text-[#60756a]">Bu alanda doğrulanmış mağaza oluştuğunda liste otomatik güncellenecek.</p></div>;
  }
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{businesses.map((business) => {
    const image = business.coverUrl || business.logoUrl;
    return <Link key={business.id} href={`/isletme/${business.slug}`} className="group overflow-hidden rounded-[26px] border border-[#153d29]/10 bg-white/85 shadow-[0_18px_50px_rgba(18,55,37,.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(18,55,37,.14)]">
      <div className="relative h-48 overflow-hidden bg-[#e5f1e8]">{image ? <Image src={image} alt={`${business.name} Fethiye işletme görseli`} fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105"/> : <Store className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[#0b6b45]" size={42}/>}</div>
      <div className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#0b6b45]">{business.category}</p><h2 className="mt-2 text-xl font-bold text-[#10241c]">{business.name}</h2></div><ArrowRight className="text-[#0b6b45] transition group-hover:translate-x-1"/></div><p className="mt-3 line-clamp-2 text-sm leading-6 text-[#60756a]">{business.description || `${business.name} hizmetlerini, fiyatlarını ve uygun randevu saatlerini inceleyin.`}</p><div className="mt-4 flex items-center justify-between border-t border-[#153d29]/8 pt-4 text-xs"><span className="flex items-center gap-1 text-[#60756a]"><MapPin size={14}/>{business.district}, {business.city}</span>{(business.reviewCount ?? 0) > 0 && <span className="flex items-center gap-1 font-bold text-[#10241c]"><Star size={14} className="text-orange-500" fill="currentColor"/>{business.rating.toFixed(1)}</span>}</div></div>
    </Link>;
  })}</div>;
}
