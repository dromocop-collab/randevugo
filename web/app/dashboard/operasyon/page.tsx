"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Boxes, Gift, Package, PackageCheck, ReceiptText, Sparkles, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useBusinessContext } from "@/features/businesses/business-context";
import { listAppointments } from "@/features/appointments/appointment-repository";
import { listCustomers } from "@/features/customers/customer-repository";
import {
  getRewardProgramSettings, listCustomerPackages, listFinanceTransactions,
  listLoyaltyAccounts, listProducts, listServicePackages, updateRewardProgramSettings,
} from "@/features/operations/operations-repository";
import type { Appointment } from "@/types/appointments";
import type { Customer } from "@/types/customer";
import type { CustomerPackage, FinanceTransaction, LoyaltyAccount, Product, RewardProgramSettings, ServicePackage } from "@/types/operations";
import { EmptyState, HeroChip, Pill, Sk, StatTile, StudioHero, StudioPage, StudioSkeleton, cx, studio } from "../_studio";
import { defaultRewardProgram, errorText, money } from "./shared";
import { CheckoutTab } from "./checkout-tab";
import { ProductsTab } from "./products-tab";
import { PackagesTab } from "./packages-tab";
import { FinanceTab } from "./finance-tab";
import { LoyaltyTab } from "./loyalty-tab";
import o from "./ops.module.css";

type Tab = "checkout" | "products" | "packages" | "finance" | "loyalty";
const tabs: Array<{ id: Tab; label: string; shortLabel: string; description: string; help: string; icon: typeof ReceiptText }> = [
  { id: "checkout", label: "Kasa & Tahsilat", shortLabel: "Ödeme al", description: "Bekleyen ödemeleri kapatın", help: "Müşteriyi seçin; ürün, indirim ve ödeme yöntemini tek ekranda tamamlayın.", icon: ReceiptText },
  { id: "products", label: "Ürün & Stok", shortLabel: "Stoku yönet", description: "Ürünleri ve adetleri izleyin", help: "Ürün ekleyin, fiyatları düzenleyin ve azalan stokları erkenden görün.", icon: Boxes },
  { id: "packages", label: "Paket & Seans", shortLabel: "Paket sat", description: "Paket oluşturun ve müşteriye ekleyin", help: "Seans paketi hazırlayın, müşteriye tanımlayın ve kalan seansı takip edin.", icon: Package },
  { id: "finance", label: "Gelir & Gider", shortLabel: "Kasayı izle", description: "Para hareketlerini kontrol edin", help: "Geliri, gideri ve kasada kalan tutarı anlaşılır bir hareket listesinde görün.", icon: Wallet },
  { id: "loyalty", label: "Puan & Ödül", shortLabel: "Sadakati yönet", description: "Puan kuralınızı belirleyin", help: "Müşterinin nasıl puan kazanacağını belirleyin ve mevcut puanları takip edin.", icon: Gift },
];

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
  const [customers, setCustomers] = useState<Customer[]>([]);
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
      const [appointmentRows, productRows, packageRows, soldPackages, financeRows, loyaltyRows, rewardSettings, customerRows] = await Promise.all([
        canCheckout ? listAppointments(businessId) : Promise.resolve([]),
        (canCheckout || canCatalog) ? listProducts(businessId) : Promise.resolve([]),
        canPackages ? listServicePackages(businessId) : Promise.resolve([]),
        canPackages ? listCustomerPackages(businessId) : Promise.resolve([]),
        (canFinance || canCheckout) ? listFinanceTransactions(businessId) : Promise.resolve([]),
        canCheckout ? listLoyaltyAccounts(businessId) : Promise.resolve([]),
        canCheckout ? getRewardProgramSettings(businessId) : Promise.resolve(defaultRewardProgram),
        canPackages ? listCustomers(businessId) : Promise.resolve([]),
      ]);
      setAppointments(appointmentRows); setProducts(productRows); setPackages(packageRows);
      setCustomerPackages(soldPackages); setTransactions(financeRows); setLoyalty(loyaltyRows);
      setRewardProgram(rewardSettings);
      setCustomers(customerRows);
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
  const criticalProducts = products.filter((item) => item.isActive && item.stock <= item.criticalStock);
  const activeCustomerPackages = customerPackages.filter((item) => item.status === "active" && item.remainingSessions > 0);
  const currentTab = tabs.find((item) => item.id === activeTab) ?? tabs[0];
  const moduleStatus: Record<Tab, string> = {
    checkout: unpaidAppointments.length ? `${unpaidAppointments.length} işlem bekliyor` : "Bekleyen ödeme yok",
    products: criticalProducts.length ? `${criticalProducts.length} stok azalıyor` : `${products.length} ürün kayıtlı`,
    packages: activeCustomerPackages.length ? `${activeCustomerPackages.length} aktif müşteri paketi` : `${packages.length} paket hazır`,
    finance: `Net ${money(income - expenses)}`,
    loyalty: `${loyalty.reduce((sum, item) => sum + item.points, 0).toLocaleString("tr-TR")} aktif puan`,
  };
  const moduleAlert: Record<Tab, boolean> = {
    checkout: unpaidAppointments.length > 0, products: criticalProducts.length > 0, packages: false, finance: false, loyalty: false,
  };

  if (!businessId) return <StudioPage label="Operasyon merkezi"><StudioSkeleton stats={4} rows={4} label="Operasyon merkezi yükleniyor" /></StudioPage>;
  if (!activeTab) return <StudioPage label="Operasyon merkezi"><EmptyState mood="thinking" title="Operasyon merkezi yetkisi gerekli" description="İşletme yöneticiniz size kasa, stok, paket veya finans yetkisi verebilir." /></StudioPage>;

  const CurrentIcon = currentTab.icon;

  return <StudioPage label="Operasyon merkezi">
    <StudioHero eyebrow="Kasa ve operasyon merkezi" icon={Sparkles}
      title={<>Günlük işlerinizi <span className={o.heroAccent}>tek ekrandan</span> yönetin.</>}
      description="Ödeme alın, stokları takip edin, paket satın ve kasanızı kontrol edin. Yaptığınız her işlem ilgili kayıtlara otomatik işlensin."
      actions={(canCheckout || canFinance) ? <>
        {canCheckout && <button type="button" className={cx(studio.btn, studio.btnBright)} onClick={() => setTab("checkout")}><ReceiptText size={17} aria-hidden /> Ödeme almaya başla <ArrowRight size={16} aria-hidden /></button>}
        {canFinance && <button type="button" className={cx(studio.btn, studio.btnGlass)} onClick={() => setTab("finance")}><Wallet size={17} aria-hidden /> Kasa hareketlerini gör</button>}
      </> : undefined}>
      <HeroChip icon={CurrentIcon} value={currentTab.label} label={<span className={o.heroChipNote}>· {moduleStatus[currentTab.id]}</span>} />
    </StudioHero>

    <div className={studio.stats}>
      <StatTile icon={ReceiptText} label="Ödeme bekleyen" value={unpaidAppointments.length} hint={unpaidAppointments.length ? "Tahsilat bekliyor" : "Tüm ödemeler tamam"} />
      <StatTile icon={Boxes} label="Azalan stok" value={criticalProducts.length} hint={criticalProducts.length ? "Kontrol etmeniz iyi olur" : "Stoklar yeterli"} />
      <StatTile icon={PackageCheck} label="Aktif paket" value={activeCustomerPackages.length} hint="Müşterilerde tanımlı" />
      <StatTile icon={Wallet} label="Kasada kalan" value={money(income - expenses)} hint={`${money(income)} toplam giriş`} accent />
    </div>

    <nav className={o.modules} aria-label="Operasyon bölümleri">
      {visibleTabs.map((item) => {
        const Icon = item.icon;
        const selected = activeTab === item.id;
        return <button key={item.id} type="button" aria-current={selected ? "page" : undefined} onClick={() => setTab(item.id)} className={cx(o.module, selected && o.moduleActive)}>
          <span className={o.moduleIcon}><Icon size={20} aria-hidden /></span>
          <span className={o.moduleCopy}><strong>{item.label}</strong><small>{item.description}</small></span>
          <span className={cx(o.moduleStatus, moduleAlert[item.id] && o.moduleStatusAlert)}>{moduleStatus[item.id]}</span>
        </button>;
      })}
    </nav>

    <header className={o.workHead}>
      <span className={o.workIcon}><CurrentIcon size={22} aria-hidden /></span>
      <div className={o.workCopy}><small>{currentTab.shortLabel}</small><h2>{currentTab.label}</h2><p>{currentTab.help}</p></div>
      <Pill tone={moduleAlert[currentTab.id] ? "warn" : "accent"} dot>{moduleStatus[currentTab.id]}</Pill>
    </header>

    {loading ? <div className={o.loading} role="status" aria-live="polite" aria-label="Operasyon verileri yükleniyor"><Sk h={260} r={26} /><Sk h={360} r={26} /></div> : <div className={studio.fadeIn} key={activeTab}>
      {activeTab === "checkout" && <CheckoutTab key={checkout?.id ?? "empty-checkout"} appointments={unpaidAppointments} products={products} loyalty={loyalty} rewardProgram={rewardProgram} search={search} setSearch={setSearch} selected={checkout} onSelect={setCheckout} businessId={businessId} busy={busy} setBusy={setBusy} onDone={load} />}
      {activeTab === "products" && <ProductsTab products={products} businessId={businessId} busy={busy} setBusy={setBusy} onDone={load} />}
      {activeTab === "packages" && <PackagesTab packages={packages} sold={customerPackages} customers={customers} businessId={businessId} busy={busy} setBusy={setBusy} onDone={load} />}
      {activeTab === "finance" && <FinanceTab rows={transactions} income={income} expenses={expenses} businessId={businessId} busy={busy} setBusy={setBusy} onDone={load} />}
      {activeTab === "loyalty" && <LoyaltyTab key={`${rewardProgram.enabled}-${rewardProgram.spendPerPoint}-${rewardProgram.pointValueTl}-${rewardProgram.minimumRedeemPoints}-${rewardProgram.maxRedemptionPercent}-${rewardProgram.earnOnPackages}`} rows={loyalty} settings={rewardProgram} canEdit={isManager} busy={busy} onSave={async (settings) => { setBusy("reward-program"); try { const saved = await updateRewardProgramSettings(businessId, settings); setRewardProgram(saved); toast.success("Puan & Ödül ayarları güncellendi."); } catch (error) { toast.error(errorText(error)); } finally { setBusy(""); } }} />}
    </div>}
  </StudioPage>;
}
