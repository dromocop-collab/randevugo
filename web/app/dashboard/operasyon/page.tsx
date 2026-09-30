"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle, Boxes, CheckCircle2, CircleDollarSign, Gift, LoaderCircle,
  Minus, Package, Plus, ReceiptText, Search, Sparkles, TrendingUp, Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useBusinessContext } from "@/features/businesses/business-context";
import { listAppointments } from "@/features/appointments/appointment-repository";
import {
  createExpense, finalizeCheckout, getRewardProgramSettings, listCustomerPackages, listFinanceTransactions,
  listLoyaltyAccounts, listProducts, listServicePackages, redeemPackage,
  saveProduct, saveServicePackage, sellPackage, updateRewardProgramSettings,
} from "@/features/operations/operations-repository";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Appointment } from "@/types/appointments";
import type { CustomerPackage, FinanceTransaction, LoyaltyAccount, PaymentMethod, Product, RewardProgramSettings, ServicePackage } from "@/types/operations";

type Tab = "checkout" | "products" | "packages" | "finance" | "loyalty";
const tabs: Array<{ id: Tab; label: string; icon: typeof ReceiptText }> = [
  { id: "checkout", label: "Adisyon & Kasa", icon: ReceiptText },
  { id: "products", label: "Ürün & Stok", icon: Boxes },
  { id: "packages", label: "Paket & Seans", icon: Package },
  { id: "finance", label: "Gelir & Gider", icon: Wallet },
  { id: "loyalty", label: "Puan & Ödül", icon: Gift },
];
const defaultRewardProgram: RewardProgramSettings = {
  enabled: true,
  spendPerPoint: 10,
  pointValueTl: 1,
  minimumRedeemPoints: 1,
  maxRedemptionPercent: 100,
  earnOnPackages: true,
};
const paymentLabels: Record<PaymentMethod, string> = { cash: "Nakit", card: "Kart", transfer: "Havale / EFT", other: "Diğer" };
const money = (value: number) => `${Number(value || 0).toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₺`;
const date = (value?: string) => value ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const errorText = (error: unknown) => {
  const message = error instanceof Error ? error.message : "İşlem tamamlanamadı.";
  if (message.includes("already-exists")) return "Bu randevunun adisyonu daha önce kapatılmış.";
  if (message.includes("failed-precondition")) return message.split(":").at(-1)?.trim() || "İşlem koşulları artık geçerli değil.";
  return message;
};

export default function OperationsPage() {
  const { businessId, access } = useBusinessContext();
  const [tab, setTab] = useState<Tab>("checkout");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [customerPackages, setCustomerPackages] = useState<CustomerPackage[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyAccount[]>([]);
  const [rewardProgram, setRewardProgram] = useState<RewardProgramSettings>(defaultRewardProgram);
  const [search, setSearch] = useState("");
  const [checkout, setCheckout] = useState<Appointment | null>(null);
  const isManager = !!access && access.role !== "staff";
  const canCheckout = isManager || access?.permissions.manageCheckout === true;
  const canCatalog = isManager || access?.permissions.manageCatalog === true;
  const canPackages = isManager || access?.permissions.managePackages === true;
  const canFinance = isManager || access?.permissions.manageFinance === true;
  const visibleTabs = tabs.filter((item) => isManager ||
    (item.id === "checkout" && canCheckout) || (item.id === "products" && canCatalog) ||
    (item.id === "packages" && canPackages) || (item.id === "finance" && canFinance) ||
    (item.id === "loyalty" && canCheckout));
  const activeTab = visibleTabs.some((item) => item.id === tab) ? tab : visibleTabs[0]?.id;

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const [appointmentRows, productRows, packageRows, soldPackages, financeRows, loyaltyRows, rewardSettings] = await Promise.all([
        canCheckout ? listAppointments(businessId) : Promise.resolve([]),
        (canCheckout || canCatalog) ? listProducts(businessId) : Promise.resolve([]),
        canPackages ? listServicePackages(businessId) : Promise.resolve([]),
        canPackages ? listCustomerPackages(businessId) : Promise.resolve([]),
        (canFinance || canCheckout) ? listFinanceTransactions(businessId) : Promise.resolve([]),
        canCheckout ? listLoyaltyAccounts(businessId) : Promise.resolve([]),
        canCheckout ? getRewardProgramSettings(businessId) : Promise.resolve(defaultRewardProgram),
      ]);
      setAppointments(appointmentRows); setProducts(productRows); setPackages(packageRows);
      setCustomerPackages(soldPackages); setTransactions(financeRows); setLoyalty(loyaltyRows);
      setRewardProgram(rewardSettings);
      const requestedId = new URLSearchParams(window.location.search).get("appointment");
      if (requestedId) setCheckout(appointmentRows.find((item) => item.id === requestedId) ?? null);
    } catch (error) { toast.error(errorText(error)); }
    finally { setLoading(false); }
  }, [businessId, canCatalog, canCheckout, canFinance, canPackages]);

  useEffect(() => { queueMicrotask(() => void load()); }, [load]);
  const queryText = search.trim().toLocaleLowerCase("tr-TR");
  const unpaidAppointments = useMemo(() => appointments.filter((item) =>
    !["cancelled", "no_show"].includes(item.status) && item.paymentStatus !== "paid" &&
    (!queryText || `${item.customerName} ${item.serviceName ?? ""} ${item.customerPhone ?? ""}`.toLocaleLowerCase("tr-TR").includes(queryText))
  ).sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()), [appointments, queryText]);
  const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expenses = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount || 0), 0);

  if (!businessId) return <div className="grid min-h-72 place-items-center"><LoaderCircle className="animate-spin text-[var(--accent)]"/></div>;
  if (!activeTab) return <section className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-amber-950"><h1 className="text-xl font-black">Operasyon merkezi yetkisi gerekli</h1><p className="mt-2 text-sm">İşletme yöneticiniz size kasa, stok, paket veya finans yetkisi verebilir.</p></section>;

  return <div className="space-y-5 pb-12">
    <section className="dashboard-theme-hero relative overflow-hidden rounded-[32px] p-6 text-white shadow-2xl sm:p-8">
      <div className="absolute -right-20 -top-24 size-72 rounded-full border border-lime-100/20 bg-white/5"/>
      <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div><span className="dashboard-theme-hero__badge inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-black tracking-[.18em]"><Sparkles size={13}/> CANLI İŞLETME OPERASYONU</span><h1 className="mt-4 text-3xl font-black sm:text-5xl">Hizmetten tahsilata<br/>tek bağlı akış.</h1><p className="dashboard-theme-hero__description mt-3 max-w-2xl text-sm">Adisyonu kapatın; stok, gelir, paket ve Puan & Ödül kayıtları aynı anda güncellensin.</p></div>
        <div className="grid grid-cols-3 gap-2"><HeroMetric label="Açık adisyon" value={String(unpaidAppointments.length)}/><HeroMetric label="Kritik stok" value={String(products.filter((item) => item.stock <= item.criticalStock).length)}/><HeroMetric label="Net kasa" value={money(income-expenses)}/></div>
      </div>
    </section>

    <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-2 shadow-sm" aria-label="Operasyon bölümleri">
      {visibleTabs.map((item) => { const Icon=item.icon; return <button key={item.id} onClick={()=>setTab(item.id)} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-xs font-black transition ${activeTab===item.id?"bg-[var(--text-1)] text-[var(--bg-1)] shadow-lg":"text-[var(--text-3)] hover:bg-[var(--surface-2)]"}`}><Icon size={16}/>{item.label}</button>; })}
    </nav>

    {loading ? <div className="grid min-h-72 place-items-center rounded-3xl border border-[var(--border)] bg-[var(--surface-1)]"><LoaderCircle className="animate-spin text-[var(--accent)]"/></div> : <>
      {activeTab === "checkout" && <CheckoutTab key={checkout?.id ?? "empty-checkout"} appointments={unpaidAppointments} products={products} loyalty={loyalty} rewardProgram={rewardProgram} search={search} setSearch={setSearch} selected={checkout} onSelect={setCheckout} businessId={businessId} busy={busy} setBusy={setBusy} onDone={load}/>}
      {activeTab === "products" && <ProductsTab products={products} businessId={businessId} busy={busy} setBusy={setBusy} onDone={load}/>}
      {activeTab === "packages" && <PackagesTab packages={packages} sold={customerPackages} businessId={businessId} busy={busy} setBusy={setBusy} onDone={load}/>}
      {activeTab === "finance" && <FinanceTab rows={transactions} income={income} expenses={expenses} businessId={businessId} busy={busy} setBusy={setBusy} onDone={load}/>}
      {activeTab === "loyalty" && <LoyaltyTab key={`${rewardProgram.enabled}-${rewardProgram.spendPerPoint}-${rewardProgram.pointValueTl}-${rewardProgram.minimumRedeemPoints}-${rewardProgram.maxRedemptionPercent}-${rewardProgram.earnOnPackages}`} rows={loyalty} settings={rewardProgram} canEdit={isManager} busy={busy} onSave={async (settings) => { setBusy("reward-program"); try { const saved=await updateRewardProgramSettings(businessId,settings); setRewardProgram(saved); toast.success("Puan & Ödül ayarları güncellendi."); } catch(error) { toast.error(errorText(error)); } finally { setBusy(""); } }}/>}
    </>}
  </div>;
}

function HeroMetric({label,value}:{label:string;value:string}) { return <div className="min-w-24 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur"><small className="block text-[9px] font-bold uppercase tracking-wider text-emerald-100/65">{label}</small><b className="mt-1 block truncate text-lg">{value}</b></div>; }

function CheckoutTab({appointments,products,loyalty,rewardProgram,search,setSearch,selected,onSelect,businessId,busy,setBusy,onDone}:{appointments:Appointment[];products:Product[];loyalty:LoyaltyAccount[];rewardProgram:RewardProgramSettings;search:string;setSearch:(v:string)=>void;selected:Appointment|null;onSelect:(v:Appointment|null)=>void;businessId:string;busy:string;setBusy:(v:string)=>void;onDone:()=>Promise<void>}) {
  const [quantities,setQuantities]=useState<Record<string,number>>({});
  const [discount,setDiscount]=useState(0); const [pointsUsed,setPointsUsed]=useState(0); const [paidOverride,setPaidOverride]=useState<number|null>(null); const [method,setMethod]=useState<PaymentMethod>("card");
  const productTotal=products.reduce((sum,item)=>sum+(quantities[item.id]??0)*item.salePrice,0);
  const phoneDigits=(selected?.customerPhone??"").replace(/\D/g,"").slice(-10);
  const pointBalance=loyalty.find(item=>item.customerPhone.replace(/\D/g,"").slice(-10)===phoneDigits)?.points??0;
  const availablePoints=rewardProgram.enabled&&pointBalance>=rewardProgram.minimumRedeemPoints?pointBalance:0;
  const payableBeforePoints=Math.max(0,Number(selected?.servicePrice??0)+productTotal-discount);
  const maxPointsForCheckout=Math.min(availablePoints,Math.floor((payableBeforePoints*rewardProgram.maxRedemptionPercent/100)/rewardProgram.pointValueTl));
  const pointDiscount=Math.round(pointsUsed*rewardProgram.pointValueTl*100)/100;
  const total=Math.max(0,payableBeforePoints-pointDiscount);
  const paid=Math.min(total,paidOverride??total);
  async function submit(){if(!selected)return;setBusy("checkout");try{await finalizeCheckout({businessId,appointment:selected,products:Object.entries(quantities).filter(([,q])=>q>0).map(([productId,quantity])=>({productId,quantity})),discount,paidAmount:paid,paymentMethod:method,loyaltyPointsToUse:pointsUsed});toast.success("Adisyon kapatıldı; kasa, stok ve Puan & Ödül bakiyesi güncellendi.");onSelect(null);await onDone();}catch(error){toast.error(errorText(error));}finally{setBusy("");}}
  return <div className="grid gap-5 xl:grid-cols-[.82fr_1.18fr]">
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-lg"><header><p className="text-[10px] font-black tracking-[.15em] text-[var(--accent)]">AÇIK ADİSYONLAR</p><h2 className="mt-1 text-xl font-black text-[var(--text-1)]">Müşteri seçin</h2></header><label className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3"><Search size={16}/><input className="min-h-11 flex-1 bg-transparent text-sm outline-none" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Müşteri veya hizmet ara"/></label><div className="mt-4 max-h-[560px] space-y-2 overflow-y-auto pr-1">{appointments.length?appointments.map(item=><button key={item.id} onClick={()=>onSelect(item)} className={`w-full rounded-2xl border p-4 text-left transition ${selected?.id===item.id?"border-emerald-500 bg-emerald-500/[.07] ring-2 ring-emerald-500/10":"border-[var(--border)] hover:bg-[var(--surface-2)]"}`}><div className="flex items-start justify-between gap-3"><div><b className="text-sm text-[var(--text-1)]">{item.customerName}</b><p className="mt-1 text-xs text-[var(--text-3)]">{item.serviceName} · {date(item.startAt)}</p></div><strong className="text-sm text-emerald-700">{money(Number(item.servicePrice??0))}</strong></div></button>):<Empty text="Kapatılmayı bekleyen adisyon yok."/>}</div></section>
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-lg">{selected?<><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black tracking-[.15em] text-violet-500">ADİSYON</p><h2 className="mt-1 text-2xl font-black text-[var(--text-1)]">{selected.customerName}</h2><p className="text-sm text-[var(--text-3)]">{selected.serviceName} · {selected.staffName}</p></div><button onClick={()=>onSelect(null)} className="rounded-xl bg-[var(--surface-2)] px-3 py-2 text-xs font-bold">Kapat</button></div><div className="mt-5 rounded-2xl bg-[var(--surface-2)] p-4"><Line label={selected.serviceName??"Ana hizmet"} value={money(Number(selected.primaryServicePrice??selected.servicePrice??0))}/>{selected.additionalServices?.map(item=><Line key={item.serviceId} label={item.name} value={money(item.price)}/>)}</div><h3 className="mt-6 text-sm font-black text-[var(--text-1)]">Ürün ekle</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{products.filter(p=>p.isActive).map(product=>{const quantity=quantities[product.id]??0;return <div key={product.id} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] p-3"><div className="min-w-0 flex-1"><b className="block truncate text-xs text-[var(--text-1)]">{product.name}</b><small className="text-[var(--text-3)]">{money(product.salePrice)} · stok {product.stock}</small></div><button disabled={!quantity} onClick={()=>setQuantities(q=>({...q,[product.id]:Math.max(0,quantity-1)}))} className="grid size-8 place-items-center rounded-lg bg-[var(--surface-2)] disabled:opacity-30"><Minus size={14}/></button><b className="w-5 text-center text-sm">{quantity}</b><button disabled={quantity>=product.stock} onClick={()=>setQuantities(q=>({...q,[product.id]:quantity+1}))} className="grid size-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-700 disabled:opacity-30"><Plus size={14}/></button></div>})}</div><div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Input label="İndirim (₺)" type="number" min="0" max={Number(selected.servicePrice??0)+productTotal} value={discount} onChange={e=>setDiscount(Math.max(0,Number(e.target.value)))}/><Input label={rewardProgram.enabled?"Ödül puanı ("+pointBalance+" var)":"Puan programı kapalı"} type="number" min="0" max={maxPointsForCheckout} disabled={!rewardProgram.enabled||maxPointsForCheckout<rewardProgram.minimumRedeemPoints} value={pointsUsed} onChange={e=>setPointsUsed(Math.min(maxPointsForCheckout,Math.max(0,Math.floor(Number(e.target.value)))))} /><Input label="Tahsil edilen (₺)" type="number" min="0" max={total} value={paid} onChange={e=>setPaidOverride(Math.max(0,Number(e.target.value)))}/><SelectPayment value={method} onChange={setMethod}/></div><div className="mt-5 rounded-2xl bg-[linear-gradient(120deg,#082e23,#0a7654)] p-5 text-white"><Line label="Hizmetler" value={money(Number(selected.servicePrice??0))}/><Line label="Ürünler" value={money(productTotal)}/><Line label="İndirim" value={`-${money(discount)}`}/><Line label={"Ödül puanı ("+pointsUsed+")"} value={"-"+money(pointDiscount)}/><div className="my-3 border-t border-white/15"/><Line label="Ödenecek toplam" value={money(total)} strong/><Line label="Kalan" value={money(Math.max(0,total-paid))}/></div><Button className="mt-4 w-full" size="lg" onClick={()=>void submit()} loading={busy==="checkout"} iconLeft={<CheckCircle2 size={18}/>}>Adisyonu kapat</Button></>:<div className="grid min-h-[430px] place-items-center text-center"><div><span className="mx-auto grid size-16 place-items-center rounded-3xl bg-emerald-500/10 text-emerald-700"><ReceiptText size={28}/></span><h2 className="mt-4 text-xl font-black text-[var(--text-1)]">Adisyon seçilmedi</h2><p className="mt-2 text-sm text-[var(--text-3)]">Soldan bir randevu seçerek tahsilat akışını başlatın.</p></div></div>}</section>
  </div>;
}

function ProductsTab({products,businessId,busy,setBusy,onDone}:{products:Product[];businessId:string;busy:string;setBusy:(v:string)=>void;onDone:()=>Promise<void>}) {
  const empty={name:"",sku:"",salePrice:0,costPrice:0,stock:0,criticalStock:3,isActive:true}; const [form,setForm]=useState<typeof empty&{id?:string}>(empty);
  async function submit(e:FormEvent){e.preventDefault();if(!form.name.trim())return toast.error("Ürün adı zorunludur.");setBusy("product");try{await saveProduct(businessId,form);toast.success(form.id?"Ürün güncellendi.":"Ürün stoğa eklendi.");setForm(empty);await onDone();}catch(error){toast.error(errorText(error));}finally{setBusy("");}}
  return <div className="grid gap-5 xl:grid-cols-[380px_1fr]"><form onSubmit={submit} className="h-fit rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-lg"><p className="text-[10px] font-black tracking-[.15em] text-[var(--accent)]">{form.id?"ÜRÜNÜ DÜZENLE":"YENİ ÜRÜN"}</p><h2 className="mt-1 text-xl font-black">Stok kartı</h2><div className="mt-5 space-y-3"><Input label="Ürün adı" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/><Input label="Stok kodu" value={form.sku} onChange={e=>setForm(f=>({...f,sku:e.target.value}))}/><div className="grid grid-cols-2 gap-3"><Input label="Satış fiyatı" type="number" min="0" value={form.salePrice} onChange={e=>setForm(f=>({...f,salePrice:Number(e.target.value)}))}/><Input label="Maliyet" type="number" min="0" value={form.costPrice} onChange={e=>setForm(f=>({...f,costPrice:Number(e.target.value)}))}/><Input label="Stok" type="number" min="0" value={form.stock} onChange={e=>setForm(f=>({...f,stock:Number(e.target.value)}))}/><Input label="Kritik sınır" type="number" min="0" value={form.criticalStock} onChange={e=>setForm(f=>({...f,criticalStock:Number(e.target.value)}))}/></div><Button type="submit" className="w-full" loading={busy==="product"}>{form.id?"Güncelle":"Ürünü ekle"}</Button>{form.id&&<Button type="button" variant="ghost" className="w-full" onClick={()=>setForm(empty)}>Vazgeç</Button>}</div></form><section className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-lg"><div className="flex items-end justify-between"><div><p className="text-[10px] font-black tracking-[.15em] text-violet-500">CANLI STOK</p><h2 className="mt-1 text-xl font-black">{products.length} ürün</h2></div><span className="text-xs font-bold text-amber-600">{products.filter(p=>p.stock<=p.criticalStock).length} kritik</span></div><div className="mt-5 grid gap-3 md:grid-cols-2">{products.length?products.map(product=><button key={product.id} onClick={()=>setForm({id:product.id,name:product.name,sku:product.sku??"",salePrice:product.salePrice,costPrice:product.costPrice,stock:product.stock,criticalStock:product.criticalStock,isActive:product.isActive})} className="rounded-2xl border border-[var(--border)] p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg"><div className="flex items-start justify-between"><div><b className="text-sm text-[var(--text-1)]">{product.name}</b><small className="mt-1 block text-[var(--text-3)]">{product.sku||"Stok kodu yok"}</small></div><span className={`rounded-full px-2 py-1 text-[10px] font-black ${product.stock<=product.criticalStock?"bg-amber-100 text-amber-700":"bg-emerald-100 text-emerald-700"}`}>{product.stock} adet</span></div><div className="mt-4 flex justify-between text-xs"><span className="text-[var(--text-3)]">Maliyet {money(product.costPrice)}</span><strong>{money(product.salePrice)}</strong></div></button>):<Empty text="Henüz ürün eklenmedi."/>}</div></section></div>;
}

function PackagesTab({packages,sold,businessId,busy,setBusy,onDone}:{packages:ServicePackage[];sold:CustomerPackage[];businessId:string;busy:string;setBusy:(v:string)=>void;onDone:()=>Promise<void>}) {
  const [form,setForm]=useState({name:"",serviceName:"",sessionCount:5,price:0,validityDays:365,isActive:true}); const [sale,setSale]=useState({packageId:"",customerName:"",customerPhone:"",paymentMethod:"card" as PaymentMethod});
  async function create(e:FormEvent){e.preventDefault();setBusy("package");try{await saveServicePackage(businessId,form);toast.success("Paket tanımı oluşturuldu.");setForm({name:"",serviceName:"",sessionCount:5,price:0,validityDays:365,isActive:true});await onDone();}catch(error){toast.error(errorText(error));}finally{setBusy("");}}
  async function sell(e:FormEvent){e.preventDefault();if(!sale.packageId)return toast.error("Satılacak paketi seçin.");setBusy("sale");try{await sellPackage({businessId,...sale});toast.success("Paket satıldı; gelir ve sadakat kaydı oluşturuldu.");setSale({packageId:"",customerName:"",customerPhone:"",paymentMethod:"card"});await onDone();}catch(error){toast.error(errorText(error));}finally{setBusy("");}}
  async function use(id:string){setBusy(id);try{await redeemPackage(businessId,id);toast.success("Bir seans kullanıldı.");await onDone();}catch(error){toast.error(errorText(error));}finally{setBusy("");}}
  return <div className="space-y-5"><div className="grid gap-5 xl:grid-cols-2"><form onSubmit={create} className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-lg"><p className="text-[10px] font-black tracking-[.15em] text-violet-500">PAKET TASARLA</p><h2 className="mt-1 text-xl font-black">Yeni hizmet paketi</h2><div className="mt-5 grid gap-3 sm:grid-cols-2"><Input label="Paket adı" value={form.name} required onChange={e=>setForm(f=>({...f,name:e.target.value}))}/><Input label="Hizmet adı" value={form.serviceName} required onChange={e=>setForm(f=>({...f,serviceName:e.target.value}))}/><Input label="Seans adedi" type="number" min="1" value={form.sessionCount} onChange={e=>setForm(f=>({...f,sessionCount:Number(e.target.value)}))}/><Input label="Paket fiyatı" type="number" min="0" value={form.price} onChange={e=>setForm(f=>({...f,price:Number(e.target.value)}))}/><Input label="Geçerlilik (gün)" type="number" min="1" value={form.validityDays} onChange={e=>setForm(f=>({...f,validityDays:Number(e.target.value)}))}/></div><Button type="submit" className="mt-4 w-full" loading={busy==="package"}>Paketi oluştur</Button></form><form onSubmit={sell} className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-lg"><p className="text-[10px] font-black tracking-[.15em] text-emerald-600">PAKET SATIŞI</p><h2 className="mt-1 text-xl font-black">Müşteriye tanımla</h2><div className="mt-5 space-y-3"><label className="block space-y-2 text-sm text-[var(--text-2)]"><span>Paket</span><select required className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-3" value={sale.packageId} onChange={e=>setSale(s=>({...s,packageId:e.target.value}))}><option value="">Paket seçin</option>{packages.filter(p=>p.isActive).map(p=><option key={p.id} value={p.id}>{p.name} · {p.sessionCount} seans · {money(p.price)}</option>)}</select></label><div className="grid gap-3 sm:grid-cols-2"><Input label="Müşteri adı" required value={sale.customerName} onChange={e=>setSale(s=>({...s,customerName:e.target.value}))}/><Input label="Telefon" required placeholder="05XX XXX XX XX" value={sale.customerPhone} onChange={e=>setSale(s=>({...s,customerPhone:e.target.value}))}/></div><SelectPayment value={sale.paymentMethod} onChange={value=>setSale(s=>({...s,paymentMethod:value}))}/><Button type="submit" className="w-full" loading={busy==="sale"}>Paketi sat ve tahsil et</Button></div></form></div><section className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-lg"><div><p className="text-[10px] font-black tracking-[.15em] text-[var(--accent)]">AKTİF MÜŞTERİ PAKETLERİ</p><h2 className="mt-1 text-xl font-black">Seans kullanım takibi</h2></div><div className="mt-5 grid gap-3 lg:grid-cols-2">{sold.length?sold.map(item=><article key={item.id} className="rounded-2xl border border-[var(--border)] p-4"><div className="flex items-start justify-between"><div><b className="text-sm">{item.customerName}</b><p className="text-xs text-[var(--text-3)]">{item.packageName} · {item.serviceName}</p></div><span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-black text-violet-700">{item.remainingSessions}/{item.totalSessions} seans</span></div><div className="mt-4 flex items-center justify-between"><small className="text-[var(--text-3)]">Bitiş: {date(item.expiresAt)}</small><Button size="sm" variant="secondary" disabled={item.status!=="active"||item.remainingSessions<1} loading={busy===item.id} onClick={()=>void use(item.id)}>1 seans kullan</Button></div></article>):<Empty text="Satılmış paket bulunmuyor."/>}</div></section></div>;
}

function FinanceTab({rows,income,expenses,businessId,busy,setBusy,onDone}:{rows:FinanceTransaction[];income:number;expenses:number;businessId:string;busy:string;setBusy:(v:string)=>void;onDone:()=>Promise<void>}) { const [form,setForm]=useState({amount:0,category:"Genel gider",description:"",paymentMethod:"cash" as PaymentMethod});async function submit(e:FormEvent){e.preventDefault();setBusy("expense");try{await createExpense(businessId,form);toast.success("Gider kaydı oluşturuldu.");setForm({amount:0,category:"Genel gider",description:"",paymentMethod:"cash"});await onDone();}catch(error){toast.error(errorText(error));}finally{setBusy("");}}return <div className="space-y-5"><section className="grid gap-3 sm:grid-cols-3"><Summary label="Toplam gelir" value={money(income)} tone="emerald"/><Summary label="Toplam gider" value={money(expenses)} tone="rose"/><Summary label="Net kasa" value={money(income-expenses)} tone="violet"/></section><div className="grid gap-5 xl:grid-cols-[380px_1fr]"><form onSubmit={submit} className="h-fit rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-lg"><p className="text-[10px] font-black tracking-[.15em] text-rose-500">GİDER GİRİŞİ</p><h2 className="mt-1 text-xl font-black">Masraf kaydet</h2><div className="mt-5 space-y-3"><Input label="Tutar" type="number" min="0.01" step="0.01" required value={form.amount} onChange={e=>setForm(f=>({...f,amount:Number(e.target.value)}))}/><Input label="Kategori" required value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}/><Input label="Açıklama" required value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/><SelectPayment value={form.paymentMethod} onChange={value=>setForm(f=>({...f,paymentMethod:value}))}/><Button type="submit" className="w-full" loading={busy==="expense"}>Gideri kaydet</Button></div></form><section className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-lg"><p className="text-[10px] font-black tracking-[.15em] text-[var(--accent)]">KASA HAREKETLERİ</p><h2 className="mt-1 text-xl font-black">Son işlemler</h2><div className="mt-5 space-y-2">{rows.length?rows.slice(0,60).map(item=><article key={item.id} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] p-3"><span className={`grid size-10 place-items-center rounded-xl ${item.type==="income"?"bg-emerald-100 text-emerald-700":"bg-rose-100 text-rose-700"}`}>{item.type==="income"?<TrendingUp size={18}/>:<CircleDollarSign size={18}/>}</span><div className="min-w-0 flex-1"><b className="block truncate text-sm">{item.description}</b><small className="text-[var(--text-3)]">{item.category} · {paymentLabels[item.paymentMethod]} · {date(item.occurredAt)}</small></div><strong className={item.type==="income"?"text-emerald-700":"text-rose-600"}>{item.type==="income"?"+":"-"}{money(item.amount)}</strong></article>):<Empty text="Henüz kasa hareketi yok."/>}</div></section></div></div>; }

function LoyaltyTab({rows,settings,canEdit,busy,onSave}:{rows:LoyaltyAccount[];settings:RewardProgramSettings;canEdit:boolean;busy:string;onSave:(settings:RewardProgramSettings)=>Promise<void>}) {
  const [form,setForm]=useState(settings);
  const total=rows.reduce((sum,row)=>sum+row.points,0);
  const change=(key:keyof RewardProgramSettings,value:number|boolean)=>setForm(current=>({...current,[key]:value}));
  async function submit(event:FormEvent){event.preventDefault();await onSave({
    enabled:form.enabled,
    spendPerPoint:Math.max(1,Number(form.spendPerPoint)||1),
    pointValueTl:Math.max(.01,Number(form.pointValueTl)||.01),
    minimumRedeemPoints:Math.max(0,Math.floor(Number(form.minimumRedeemPoints)||0)),
    maxRedemptionPercent:Math.min(100,Math.max(1,Math.floor(Number(form.maxRedemptionPercent)||1))),
    earnOnPackages:form.earnOnPackages,
  });}
  return <div className="space-y-5">
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Summary label="Program durumu" value={settings.enabled?"Aktif":"Kapalı"} tone="emerald"/>
      <Summary label="Aktif puan" value={total.toLocaleString("tr-TR")} tone="violet"/>
      <Summary label="Kazanım kuralı" value={`${money(settings.spendPerPoint)} = 1 puan`} tone="amber"/>
      <Summary label="Puan değeri" value={`1 puan = ${money(settings.pointValueTl)}`} tone="emerald"/>
    </section>
    <div className="grid gap-5 xl:grid-cols-[.82fr_1.18fr]">
      <form onSubmit={submit} className="h-fit rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-lg">
        <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black tracking-[.15em] text-[var(--accent)]">PUAN & ÖDÜL AYARLARI</p><h2 className="mt-1 text-xl font-black text-[var(--text-1)]">Kendi puan kuralınızı belirleyin</h2><p className="mt-2 text-xs leading-5 text-[var(--text-3)]">Yeni tahsilatlar kaydedildiği anda bu kurallara göre puan kazanılır ve kasada indirime dönüşür.</p></div><button type="button" role="switch" aria-checked={form.enabled} disabled={!canEdit} onClick={()=>change("enabled",!form.enabled)} className={`relative h-8 w-14 shrink-0 rounded-full transition ${form.enabled?"bg-emerald-500":"bg-slate-300"} disabled:opacity-60`}><span className={`absolute top-1 size-6 rounded-full bg-white shadow transition ${form.enabled?"left-7":"left-1"}`}/></button></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Input label="Kaç ₺ harcamaya 1 puan?" type="number" min="1" step="0.01" disabled={!canEdit} value={form.spendPerPoint} onChange={event=>change("spendPerPoint",Number(event.target.value))}/>
          <Input label="1 puan kaç ₺ değerinde?" type="number" min="0.01" step="0.01" disabled={!canEdit} value={form.pointValueTl} onChange={event=>change("pointValueTl",Number(event.target.value))}/>
          <Input label="Minimum kullanım puanı" type="number" min="0" step="1" disabled={!canEdit} value={form.minimumRedeemPoints} onChange={event=>change("minimumRedeemPoints",Number(event.target.value))}/>
          <Input label="Sepetin en fazla yüzde kaçı?" type="number" min="1" max="100" step="1" disabled={!canEdit} value={form.maxRedemptionPercent} onChange={event=>change("maxRedemptionPercent",Number(event.target.value))}/>
        </div>
        <button type="button" disabled={!canEdit} onClick={()=>change("earnOnPackages",!form.earnOnPackages)} className="mt-4 flex w-full items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-left disabled:opacity-60"><span><b className="block text-sm text-[var(--text-1)]">Paket satışlarından puan kazandır</b><small className="mt-1 block text-xs text-[var(--text-3)]">Kapalıysa yalnız adisyon tahsilatları puan üretir.</small></span><span className={`rounded-full px-3 py-1 text-[10px] font-black ${form.earnOnPackages?"bg-emerald-100 text-emerald-700":"bg-slate-200 text-slate-600"}`}>{form.earnOnPackages?"AÇIK":"KAPALI"}</span></button>
        <div className="mt-4 rounded-2xl bg-[var(--surface-2)] p-4 text-xs leading-5 text-[var(--text-3)]"><b className="block text-[var(--text-1)]">Canlı örnek</b>{money(form.spendPerPoint*10)} harcayan müşteri <strong className="text-[var(--accent)]">10 puan</strong> kazanır; bu puanlar kasada <strong className="text-[var(--accent)]">{money(form.pointValueTl*10)}</strong> indirim sağlar.</div>
        {canEdit?<Button type="submit" className="mt-4 w-full" loading={busy==="reward-program"}>Ayarları kaydet</Button>:<p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800">Bu ayarları yalnız işletme yöneticileri değiştirebilir.</p>}
      </form>
      <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-lg"><p className="text-[10px] font-black tracking-[.15em] text-violet-500">MÜŞTERİ ÖDÜLLERİ</p><h2 className="mt-1 text-xl font-black">Puan hesapları</h2><div className="mt-5 grid gap-3 md:grid-cols-2">{rows.length?rows.map(item=><article key={item.id} className="rounded-2xl border border-[var(--border)] p-4"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><b className="block truncate text-sm">{item.customerName}</b><small className="block text-[var(--text-3)]">{item.customerPhone}</small></div><span className="shrink-0 rounded-2xl bg-violet-100 px-3 py-2 text-sm font-black text-violet-700">{item.points} puan</span></div><div className="mt-4 flex flex-wrap justify-between gap-2 text-xs text-[var(--text-3)]"><span>Toplam harcama {money(item.totalSpent)}</span><span>Toplam kazanım {item.lifetimePoints} puan</span></div></article>):<Empty text="İlk uygun tahsilatla puan hesabı otomatik oluşacak."/>}</div></section>
    </div>
  </div>;
}

function SelectPayment({value,onChange}:{value:PaymentMethod;onChange:(v:PaymentMethod)=>void}) { return <label className="space-y-2 text-sm text-[var(--text-2)]"><span>Ödeme yöntemi</span><select className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-3 text-sm" value={value} onChange={e=>onChange(e.target.value as PaymentMethod)}>{Object.entries(paymentLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>; }
function Line({label,value,strong=false}:{label:string;value:string;strong?:boolean}) { return <div className={`flex items-center justify-between gap-4 py-1.5 ${strong?"text-lg font-black":"text-sm"}`}><span className={strong?"":"text-[var(--text-3)]"}>{label}</span><b>{value}</b></div>; }
function Summary({label,value,tone}:{label:string;value:string;tone:"emerald"|"rose"|"violet"|"amber"}) { const colors={emerald:"from-emerald-500/15 to-emerald-500/5 text-emerald-700",rose:"from-rose-500/15 to-rose-500/5 text-rose-700",violet:"from-violet-500/15 to-violet-500/5 text-violet-700",amber:"from-amber-500/15 to-amber-500/5 text-amber-700"};return <article className={`rounded-3xl border border-[var(--border)] bg-gradient-to-br ${colors[tone]} p-5`}><small className="font-bold uppercase tracking-wider">{label}</small><b className="mt-2 block text-2xl">{value}</b></article>; }
function Empty({text}:{text:string}) { return <div className="col-span-full rounded-2xl border border-dashed border-[var(--border)] p-8 text-center"><AlertTriangle className="mx-auto text-[var(--text-3)]" size={22}/><p className="mt-2 text-sm text-[var(--text-3)]">{text}</p></div>; }
