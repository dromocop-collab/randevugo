"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/features/auth/auth-service";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { useBusinessContext } from "@/features/businesses/business-context";
import { Check, CirclePlus, Clock3, Compass, ExternalLink, LogOut, Palette, Sparkles, Store, UserRound } from "lucide-react";
import { NotificationCenter } from "@/components/dashboard/notification-center";

export function DashboardTopBar() {
  const { user } = useAuth();
  const { businesses, businessId, setBusinessId } = useBusinessContext();
  const activeBusiness = businesses.find((business) => business.id === businessId) ?? businesses[0];
  const router = useRouter();
  const [skinOpen, setSkinOpen] = useState(false);
  const [skin, setSkin] = useState("emerald");
  const skinPanelRef = useRef<HTMLDivElement>(null);
  const skinReadyRef = useRef(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("sr-dashboard-skin") ?? "emerald";
    document.documentElement.dataset.dashboardSkin = saved;
    queueMicrotask(() => { skinReadyRef.current = true; setSkin(saved); });
  }, []);

  useEffect(() => {
    if (!skinReadyRef.current) return;
    document.documentElement.dataset.dashboardSkin = skin;
    window.localStorage.setItem("sr-dashboard-skin", skin);
  }, [skin]);

  useEffect(() => {
    if (!skinOpen) return;
    const close = (event: MouseEvent) => {
      if (!skinPanelRef.current?.contains(event.target as Node)) setSkinOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [skinOpen]);

  function chooseSkin(value: string) {
    setSkin(value);
    setSkinOpen(false);
  }

  return (
    <header className="dashboard-topbar dashboard-command-bar">
      <div className="dashboard-command-inner">
        <div className="dashboard-command-copy">
          <p><span /> İŞLETME OS <i>CANLI</i></p>
          <h1>Operasyon merkeziniz hazır.</h1>
        </div>
        <div className="dashboard-command-actions">
          {businesses.length > 1 && (
            <select
              value={activeBusiness?.id ?? ""}
              onChange={(e) => setBusinessId(e.target.value)}
              className="command-business-select h-8 max-w-[150px] truncate rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 text-xs font-medium text-[var(--text-1)] outline-none hover:bg-[var(--surface-3)] focus:border-[var(--accent)]"
              aria-label="İşletme değiştir"
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}{b.status === "pending_review" ? " · Onay bekliyor" : b.status === "rejected" ? " · Reddedildi" : ""}
                </option>
              ))}
            </select>
          )}
          {businesses.length < 3 && <Link href="/onboarding" className="command-link command-new-store"><CirclePlus size={17} /><span>Yeni mağaza</span></Link>}
          {activeBusiness?.status === "pending_review" && <span className="command-link command-pending text-amber-700"><Clock3 size={16} /><span>Süper admin onayı bekleniyor</span></span>}
          <NotificationCenter key={businessId} businessId={businessId}/>
          <div className="dashboard-skin-picker" ref={skinPanelRef}>
            <button type="button" className="command-link dashboard-skin-trigger" onClick={() => setSkinOpen((value) => !value)} aria-expanded={skinOpen} aria-label="Panel görünümünü değiştir"><Palette size={17}/><span>Görünüm</span></button>
            <div className={`dashboard-skin-menu ${skinOpen ? "open" : ""}`}>
              <header><span><Sparkles size={14}/> Panel atmosferi</span><small>Tercihiniz bu cihazda saklanır</small></header>
              {[{id:"emerald",name:"Aurora",colors:["#0b6b45","#bdf65e"]},{id:"midnight",name:"Gece",colors:["#172554","#22d3ee"]},{id:"pearl",name:"İnci",colors:["#64748b","#f59e0b"]}].map((item) => <button type="button" key={item.id} onClick={() => chooseSkin(item.id)} className={skin === item.id ? "active" : ""}><i>{item.colors.map((color) => <b key={color} style={{background:color}}/>)}</i><span>{item.name}<small>{item.id === "emerald" ? "Canlı ve enerjik" : item.id === "midnight" ? "Odaklı ve güçlü" : "Sade ve premium"}</small></span>{skin === item.id && <Check size={16}/>}</button>)}
            </div>
          </div>
          <Link href="/kesfet" className="command-link command-link-discover"><Compass size={17} /><span>Keşfet</span></Link>
          {activeBusiness?.slug && <Link href={`/isletme/${activeBusiness.slug}`} className="command-link command-link-store"><Store size={17} /><span>Mağazamı gör</span><ExternalLink size={14} /></Link>}
          <span className="command-account"><i><UserRound size={15} /></i><span><small>Aktif hesap</small><b>{user?.email ?? ""}</b></span></span>
          <Button
            variant="ghost"
            className="command-logout"
            onClick={async () => {
              await logout();
              router.push("/isletmeler/giris");
            }}
          >
            <LogOut size={16} /><span>Çıkış</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
