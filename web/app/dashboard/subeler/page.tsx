"use client";

import { FormEvent, type ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRight, BadgeCheck, Building2, CirclePlus, Crown, ExternalLink, GitBranch,
  MapPin, Network, ShieldCheck, Store, X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useBusinessContext } from "@/features/businesses/business-context";
import {
  createBusinessFromOnboarding,
  listBusinessWorkingHours,
} from "@/features/businesses/business-repository";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { userFacingError } from "@/lib/errors/user-facing-error";

const MAX_BRANCHES = 10;

function slugify(value: string) {
  return value.toLocaleLowerCase("tr-TR")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g")
    .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const statusCopy: Record<string, { label: string; className: string }> = {
  active: { label: "Aktif", className: "bg-emerald-500/10 text-emerald-700" },
  pending_review: { label: "Süper Admin onayında", className: "bg-amber-500/10 text-amber-700" },
  rejected: { label: "Başvuru reddedildi", className: "bg-rose-500/10 text-rose-700" },
  suspended: { label: "Askıya alındı", className: "bg-slate-500/10 text-slate-600" },
};

export default function BranchesPage() {
  const { user } = useAuth();
  const { businesses, businessId, setBusinessId, refreshBusinesses, access } = useBusinessContext();
  const activeBusiness = businesses.find((item) => item.id === businessId) ?? businesses[0];
  const organizationId = activeBusiness?.organizationId;
  const branches = useMemo(() => {
    const rows = organizationId
      ? businesses.filter((item) => item.organizationId === organizationId)
      : businesses.filter((item) => item.ownerUid === activeBusiness?.ownerUid);
    return [...rows].sort((a, b) => Number(a.branchNumber ?? a.storePosition ?? 999) - Number(b.branchNumber ?? b.storePosition ?? 999));
  }, [activeBusiness?.ownerUid, businesses, organizationId]);
  const headquarters = branches.find((item) => item.isHeadquarters) ?? branches[0];
  const canCreate = access?.role === "owner" && branches.length < MAX_BRANCHES;
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copyHours, setCopyHours] = useState(true);
  const [form, setForm] = useState({
    name: "", slug: "", phone: activeBusiness?.phone ?? "", email: activeBusiness?.email ?? "",
    city: activeBusiness?.city ?? "", district: "", address: "",
  });

  function setField(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value, ...(key === "name" && !current.slug ? { slug: slugify(value) } : {}) }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user || !activeBusiness || !headquarters || !canCreate || busy) return;
    setBusy(true);
    try {
      const workingHours = copyHours ? await listBusinessWorkingHours(activeBusiness.id) : [];
      const result = await createBusinessFromOnboarding({
        ownerUid: user.uid,
        parentBusinessId: headquarters.id,
        name: form.name.trim(),
        slug: slugify(form.slug),
        category: activeBusiness.category,
        phone: form.phone,
        email: form.email,
        city: form.city,
        district: form.district,
        address: form.address,
        description: activeBusiness.description,
        logoUrl: activeBusiness.logoUrl,
        coverUrl: activeBusiness.coverUrl,
        workingHours,
      });
      refreshBusinesses();
      setBusinessId(result.businessId);
      setShowForm(false);
      setForm({ name: "", slug: "", phone: activeBusiness.phone, email: activeBusiness.email, city: activeBusiness.city, district: "", address: "" });
      toast.success("Şube oluşturuldu ve Süper Admin onayına gönderildi.");
    } catch (error) {
      toast.error(userFacingError(error, "Şube oluşturulamadı. Bilgileri kontrol edip yeniden deneyin."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[30px] bg-[linear-gradient(125deg,#062e24,#075f46_58%,#0a7c58)] p-6 text-white shadow-2xl shadow-emerald-950/15 sm:p-8">
        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full border border-white/10 bg-lime-300/10" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="flex items-center gap-2 text-[11px] font-bold tracking-[.22em] text-lime-200"><Network size={15}/> FİRMA VE ŞUBE AĞI</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{activeBusiness?.organizationName ?? headquarters?.name ?? "Şube yönetimi"}</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/75">Her şubenin randevusu, ekibi, hizmeti ve çalışma saati ayrıdır. Firma sahipliği, paket ve Süper Admin onayı merkezden izlenir.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur"><small className="block text-[10px] font-bold tracking-widest text-emerald-100/70">ŞUBE KAPASİTESİ</small><b className="mt-1 block text-xl">{branches.length} / {MAX_BRANCHES}</b></div>
            {canCreate && <Button type="button" onClick={() => setShowForm(true)} className="border-0 bg-lime-300 text-emerald-950 shadow-lime-950/20 hover:bg-lime-200" iconLeft={<CirclePlus size={18}/>}>Yeni şube ekle</Button>}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Summary icon={<Crown size={18}/>} label="Merkez şube" value={headquarters?.name ?? "Belirleniyor"} />
        <Summary icon={<BadgeCheck size={18}/>} label="Yayındaki şube" value={String(branches.filter((item) => item.status === "active" && !item.isSuspended).length)} />
        <Summary icon={<ShieldCheck size={18}/>} label="Onay bekleyen" value={String(branches.filter((item) => item.status === "pending_review").length)} />
      </section>

      {access?.role !== "owner" && (
        <div className="rounded-2xl border border-amber-300/40 bg-amber-50 p-4 text-sm text-amber-900">Şube açma yetkisi firma sahibine aittir. Mevcut yetkinizle erişebildiğiniz şubeler arasında geçiş yapabilirsiniz.</div>
      )}

      <section className="grid gap-4 xl:grid-cols-2">
        {branches.map((branch) => {
          const status = statusCopy[branch.isSuspended ? "suspended" : branch.status] ?? statusCopy.suspended;
          const selected = branch.id === activeBusiness?.id;
          return (
            <article key={branch.id} className={`rounded-[26px] border bg-[var(--surface-1)] p-5 shadow-lg shadow-[var(--shadow-soft)] transition ${selected ? "border-[var(--accent)] ring-2 ring-[var(--ring)]" : "border-[var(--border)]"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-700"><Store size={22}/></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-lg font-extrabold text-[var(--text-1)]">{branch.name}</h2>{branch.isHeadquarters || branch.id === headquarters?.id ? <span className="rounded-full bg-lime-300 px-2 py-0.5 text-[10px] font-black text-emerald-950">MERKEZ</span> : null}</div><p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--text-3)]"><MapPin size={13}/>{branch.district}, {branch.city}</p></div></div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${status.className}`}>{status.label}</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-[var(--surface-2)] p-3 text-xs"><div><small className="text-[var(--text-3)]">Şube kodu</small><b className="mt-1 block text-[var(--text-1)]">{branch.branchCode ?? `ŞUBE-${branch.storePosition ?? 1}`}</b></div><div><small className="text-[var(--text-3)]">Kategori</small><b className="mt-1 block text-[var(--text-1)]">{branch.category}</b></div></div>
              <div className="mt-4 flex flex-wrap gap-2">
                {!selected && <Button size="sm" onClick={() => setBusinessId(branch.id)} iconRight={<ArrowRight size={14}/>}>Bu şubeyi yönet</Button>}
                {selected && <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-700"><BadgeCheck size={14}/> Seçili çalışma alanı</span>}
                {branch.slug && <Link href={`/isletme/${branch.slug}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-bold text-[var(--text-2)]">Mağazayı gör <ExternalLink size={13}/></Link>}
              </div>
            </article>
          );
        })}
      </section>

      {showForm && (
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-emerald-950/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setShowForm(false); }}>
          <form onSubmit={submit} className="my-6 w-full max-w-3xl overflow-hidden rounded-[30px] border border-white/20 bg-[var(--surface-1)] shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="branch-form-title">
            <header className="flex items-start justify-between bg-[linear-gradient(120deg,#073b2c,#087451)] p-6 text-white"><div><p className="flex items-center gap-2 text-[10px] font-bold tracking-[.2em] text-lime-200"><GitBranch size={14}/> YENİ ŞUBE KURULUMU</p><h2 id="branch-form-title" className="mt-2 text-2xl font-black">Firma ağına şube ekle</h2><p className="mt-1 text-sm text-emerald-50/70">Şube ayrı bir operasyon alanı olarak açılır ve yayın öncesi Süper Admin onayına gider.</p></div><button type="button" disabled={busy} onClick={() => setShowForm(false)} className="rounded-xl border border-white/15 p-2" aria-label="Kapat"><X size={18}/></button></header>
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <Input required label="Şube adı" value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Kadıköy Şubesi" />
              <Input required label="Mağaza adresi" value={form.slug} onChange={(e) => setField("slug", slugify(e.target.value))} placeholder="marka-kadikoy" />
              <Input required label="Telefon" value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="05xx xxx xx xx" />
              <Input required type="email" label="Şube e-postası" value={form.email} onChange={(e) => setField("email", e.target.value)} />
              <Input required label="Şehir" value={form.city} onChange={(e) => setField("city", e.target.value)} />
              <Input required label="İlçe" value={form.district} onChange={(e) => setField("district", e.target.value)} />
              <div className="sm:col-span-2"><Input required label="Açık adres" value={form.address} onChange={(e) => setField("address", e.target.value)} /></div>
              <label className="sm:col-span-2 flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><input type="checkbox" checked={copyHours} onChange={(e) => setCopyHours(e.target.checked)} className="mt-1 h-4 w-4 accent-emerald-600"/><span><b className="block text-sm text-[var(--text-1)]">Seçili şubenin çalışma saatlerini kopyala</b><small className="text-[var(--text-3)]">Kurulumdan sonra yeni şubeye özel saatleri değiştirebilirsiniz.</small></span></label>
              <div className="sm:col-span-2 rounded-2xl border border-amber-300/40 bg-amber-50 p-4 text-xs leading-5 text-amber-900"><b>Onay prosedürü:</b> Yeni şube taslak olarak oluşturulur. Süper Admin adres, kategori ve firma bağlantısını onayladıktan sonra müşterilere açılır.</div>
            </div>
            <footer className="flex items-center justify-end gap-3 border-t border-[var(--border)] p-5"><Button type="button" variant="ghost" disabled={busy} onClick={() => setShowForm(false)}>Vazgeç</Button><Button type="submit" loading={busy} iconLeft={<Building2 size={17}/>}>Şubeyi oluştur ve onaya gönder</Button></footer>
          </form>
        </div>
      )}
    </div>
  );
}

function Summary({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-700">{icon}</span><span><small className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)]">{label}</small><b className="mt-1 block truncate text-sm text-[var(--text-1)]">{value}</b></span></div>;
}
