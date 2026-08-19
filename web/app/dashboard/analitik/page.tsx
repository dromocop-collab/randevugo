"use client";

import { useEffect, useMemo, useState } from "react";
import { useBusinessContext } from "@/features/businesses/business-context";
import { listAppointments } from "@/features/appointments/appointment-repository";
import { listCustomers } from "@/features/customers/customer-repository";
import type { Appointment } from "@/types/appointments";

const DAY = 86_400_000;
const WEEKDAYS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

export default function AnalyticsPage() {
  const { businessId } = useBusinessContext();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!businessId) return;
    let active = true;
    queueMicrotask(() => { if (active) { setLoading(true); setError(""); } });
    Promise.all([listAppointments(businessId), listCustomers(businessId)]).then(([items, customers]) => {
      if (!active) return; setAppointments(items); setCustomerCount(customers.length);
    }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Analitik verileri alınamadı."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [businessId]);

  const report = useMemo(() => buildReport(appointments, customerCount), [appointments, customerCount]);
  if (loading) return <AnalyticsLoading />;

  return <div className="space-y-6">
    <section className="dashboard-hero rounded-3xl border border-[var(--border)] p-6 shadow-xl sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--accent)]">Son 30 gün</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--text-1)]">Büyüme Analitiği</h1><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-3)]">Randevu akışınızın, gelirinizin ve müşteri bağlılığınızın net resmi.</p></div><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm"><span className="text-[var(--text-3)]">Veri sağlığı</span><strong className="ml-2 text-emerald-500">● Canlı</strong></div></div>
    </section>
    {error && <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-500">{error}</div>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Dönem geliri" value={currency(report.revenue)} change={report.revenueChange} note="tamamlanan randevular" />
      <MetricCard label="Randevu" value={String(report.total)} change={report.appointmentChange} note={`${report.completed} tamamlandı`} />
      <MetricCard label="Doluluk kalitesi" value={`%${report.completionRate}`} change={null} note={`%${report.noShowRate} gelmedi`} />
      <MetricCard label="Müşteri tabanı" value={String(report.customers)} change={null} note="toplam kayıtlı müşteri" />
    </section>
    <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <article className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-lg">
        <div className="flex items-center justify-between"><div><h2 className="font-bold text-[var(--text-1)]">Haftanın randevu ritmi</h2><p className="mt-1 text-xs text-[var(--text-3)]">Son 30 gündeki gün dağılımı</p></div><span className="rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs font-bold text-[var(--accent)]">Yoğun gün: {report.busiestDay}</span></div>
        <div className="mt-8 flex h-64 items-end gap-3 sm:gap-5">{report.weekdays.map((day) => <div key={day.label} className="flex h-full flex-1 flex-col justify-end gap-2 text-center"><span className="text-[10px] font-bold text-[var(--text-3)]">{day.value}</span><div className="relative h-[78%] overflow-hidden rounded-xl bg-[var(--surface-3)]"><i className="absolute inset-x-0 bottom-0 rounded-xl bg-[linear-gradient(180deg,var(--accent-2),var(--accent-3))] transition-all duration-700" style={{height:`${day.percent}%`}} /></div><small className="text-[10px] font-semibold text-[var(--text-3)]">{day.label}</small></div>)}</div>
      </article>
      <article className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-lg"><h2 className="font-bold text-[var(--text-1)]">Durum dağılımı</h2><p className="mt-1 text-xs text-[var(--text-3)]">Operasyon kalitesini izleyin</p><div className="mt-7 space-y-5">{report.statuses.map(status => <div key={status.label}><div className="mb-2 flex justify-between text-xs"><span className="font-semibold text-[var(--text-2)]">{status.label}</span><b className="text-[var(--text-1)]">{status.value}</b></div><div className="h-2 overflow-hidden rounded-full bg-[var(--surface-3)]"><i className={`block h-full rounded-full ${status.color}`} style={{width:`${status.percent}%`}} /></div></div>)}</div></article>
    </section>
    <section className="grid gap-5 lg:grid-cols-2">
      <article className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-lg"><div className="flex items-center justify-between"><h2 className="font-bold text-[var(--text-1)]">En çok tercih edilen hizmetler</h2><span className="text-xs text-[var(--text-3)]">30 gün</span></div><div className="mt-5 space-y-2">{report.services.length ? report.services.map((service,index) => <div key={service.name} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--accent)]/10 text-xs font-extrabold text-[var(--accent)]">{index+1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[var(--text-1)]">{service.name}</p><p className="text-[10px] text-[var(--text-3)]">{service.count} randevu</p></div><strong className="text-sm text-[var(--text-1)]">{currency(service.revenue)}</strong></div>) : <Empty text="Hizmet analizi için tamamlanan randevu bekleniyor." />}</div></article>
      <article className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-lg"><h2 className="font-bold text-[var(--text-1)]">Akıllı öneriler</h2><p className="mt-1 text-xs text-[var(--text-3)]">Verinize göre sıradaki en değerli aksiyonlar</p><div className="mt-5 space-y-3">{report.insights.map((insight,index) => <div key={insight} className="flex gap-3 rounded-2xl border border-[var(--border)] p-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[var(--accent)]/10 text-sm">{["↗","◎","✦"][index]}</span><p className="text-xs leading-6 text-[var(--text-2)]">{insight}</p></div>)}</div></article>
    </section>
  </div>;
}

function MetricCard({label,value,change,note}:{label:string;value:string;change:number|null;note:string}){return <article className="premium-card rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-lg"><p className="text-xs font-medium text-[var(--text-3)]">{label}</p><div className="mt-3 flex items-end justify-between"><strong className="text-3xl font-extrabold tracking-tight text-[var(--text-1)]">{value}</strong>{change !== null && <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${change>=0?"bg-emerald-500/10 text-emerald-500":"bg-rose-500/10 text-rose-500"}`}>{change>=0?"↑":"↓"} %{Math.abs(change)}</span>}</div><p className="mt-2 text-[10px] text-[var(--text-3)]">{note}</p></article>}
function Empty({text}:{text:string}){return <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-xs text-[var(--text-3)]">{text}</div>}
function AnalyticsLoading(){return <div className="grid animate-pulse gap-5"><div className="h-40 rounded-3xl bg-[var(--surface-2)]"/><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[1,2,3,4].map(i=><div key={i} className="h-32 rounded-3xl bg-[var(--surface-2)]"/>)}</div><div className="h-80 rounded-3xl bg-[var(--surface-2)]"/></div>}
function currency(value:number){return new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:0}).format(value)}

function buildReport(all:Appointment[],customers:number){
  const now=Date.now(),currentStart=now-30*DAY,previousStart=now-60*DAY;
  const current=all.filter(a=>{const t=new Date(a.startAt).getTime();return t>=currentStart&&t<=now});
  const previous=all.filter(a=>{const t=new Date(a.startAt).getTime();return t>=previousStart&&t<currentStart});
  const completed=current.filter(a=>a.status==="completed"),revenue=completed.reduce((s,a)=>s+(a.servicePrice??0),0),previousRevenue=previous.filter(a=>a.status==="completed").reduce((s,a)=>s+(a.servicePrice??0),0);
  const change=(a:number,b:number)=>b===0?(a>0?100:0):Math.round(((a-b)/b)*100);
  const counts=Array(7).fill(0) as number[];current.forEach(a=>counts[new Date(a.startAt).getDay()]++);const max=Math.max(...counts,1);
  const weekdays=counts.map((value,index)=>({label:WEEKDAYS[index],value,percent:Math.max(5,Math.round(value/max*100))}));
  const statusMap=[{key:"completed",label:"Tamamlandı",color:"bg-emerald-500"},{key:"confirmed",label:"Onaylı",color:"bg-sky-500"},{key:"pending",label:"Bekliyor",color:"bg-amber-500"},{key:"cancelled",label:"İptal",color:"bg-rose-500"},{key:"no_show",label:"Gelmedi",color:"bg-violet-500"}];
  const statuses=statusMap.map(s=>{const value=current.filter(a=>a.status===s.key).length;return {...s,value,percent:current.length?Math.round(value/current.length*100):0}});
  const services=Object.values(completed.reduce<Record<string,{name:string;count:number;revenue:number}>>((acc,a)=>{const name=a.serviceName||"Hizmet";acc[name]??={name,count:0,revenue:0};acc[name].count++;acc[name].revenue+=a.servicePrice??0;return acc},{})).sort((a,b)=>b.count-a.count).slice(0,5);
  const completionRate=current.length?Math.round(completed.length/current.length*100):0,noShow=current.filter(a=>a.status==="no_show").length,noShowRate=current.length?Math.round(noShow/current.length*100):0;
  const busiest=weekdays.reduce((a,b)=>b.value>a.value?b:a,weekdays[0]);
  const insights=[current.length===0?"İlk verinizi oluşturmak için mağaza linkinizi müşterilerinizle paylaşın.":`${busiest.label} en yoğun gününüz. Ekip müsaitliğini bu güne göre genişletmeyi değerlendirin.`,noShowRate>10?`Gelmeme oranınız %${noShowRate}. Otomatik hatırlatma ve teyit akışını güçlendirin.`:"Gelmeme oranınız kontrol altında. Mevcut teyit akışınızı koruyun.",services[0]?`${services[0].name} en çok tercih edilen hizmetiniz. Mağaza vitrininizde öne çıkarın.`:"Hizmet performansı için tamamlanan randevular biriktikçe öneriler gelişecek."];
  return {revenue,revenueChange:change(revenue,previousRevenue),total:current.length,appointmentChange:change(current.length,previous.length),completed:completed.length,completionRate,noShowRate,customers,weekdays,busiestDay:busiest.label,statuses,services,insights};
}
