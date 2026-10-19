"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";
import { ArrowUpRight, Clock3, Headphones, Mail, MessageCircleMore, Phone, X } from "lucide-react";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import { useT } from "@/i18n/client";
import { tk } from "@/i18n/config";

const HINT_KEY = "sr_rovi_hint_seen";

const SUPPORT_CHANNELS = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    desc: tk("Hızlı mesaj gönderin"),
    icon: <MessageCircleMore size={22} />,
    href: "https://wa.me/905304788298",
    eyebrow: tk("En hızlı kanal"),
  },
  {
    id: "email",
    label: tk("E-posta"),
    desc: tk("Detaylı destek talebi"),
    icon: <Mail size={22} />,
    href: "mailto:info@seninrandevun.com",
    eyebrow: tk("Detaylı talepler"),
  },
  {
    id: "phone",
    label: tk("Telefon"),
    desc: tk("Hemen arayın"),
    icon: <Phone size={22} />,
    href: "tel:+905304788298",
    eyebrow: tk("Doğrudan görüşme"),
  },
];

export function SupportBubble() {
  const t = useT();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const hasEmbeddedSupport = pathname === "/hesabim";
  const isBusinessPanel = pathname.startsWith("/dashboard") || pathname.startsWith("/isletme/") || pathname.startsWith("/super-admin");
  // Giriş/kayıt ve işletme kurulum ekranlarında Rovi zaten karşılıyor; ikinci (yüzen) maskot gereksiz.
  const isAuthScreen = ["/giris", "/kayit", "/musteri/", "/sifremi-unuttum", "/isletmeler/giris", "/isletmeler/kayit", "/onboarding"].some((route) => pathname.startsWith(route));

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 250);
  }, []);

  const handleToggle = useCallback(() => {
    if (isOpen) {
      handleClose();
    } else {
      setIsOpen(true);
    }
  }, [isOpen, handleClose]);

  // Rovi oturum başına bir kez kendini tanıtır; kısa süre sonra kendiliğinden kaybolur.
  useEffect(() => {
    let seen = false;
    try { seen = window.sessionStorage.getItem(HINT_KEY) === "1"; } catch { /* depolama kapalı olabilir */ }
    if (seen) return;
    const show = window.setTimeout(() => {
      setShowHint(true);
      try { window.sessionStorage.setItem(HINT_KEY, "1"); } catch { /* depolama kapalı olabilir */ }
    }, 4_000);
    const hide = window.setTimeout(() => setShowHint(false), 11_000);
    return () => { window.clearTimeout(show); window.clearTimeout(hide); };
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, handleClose]);

  if (isBusinessPanel || hasEmbeddedSupport || isAuthScreen) return null;

  return (
    <>
      {/* Popup */}
      {isOpen && (
        <div
          ref={popupRef}
          className={`support-popup ${isClosing ? "closing" : ""}`}
          role="dialog"
          aria-label={t("SeninRandevun destek kanalları")}
        >
          <div className="support-popup-head">
            <span><Headphones size={23} /></span>
            <div><small>{t("CANLI DESTEK")}</small><strong>{t("Yanındayız.")}</strong><p>{t("İhtiyacına uygun kanalı seç, ekibimize hemen ulaş.")}</p></div>
            <button type="button" onClick={handleClose} aria-label={t("Destek penceresini kapat")}><X size={17} /></button>
          </div>

          <div className="support-popup-channels">
            {SUPPORT_CHANNELS.map((channel) => (
              <a
                key={channel.id}
                href={channel.href}
                target={channel.id === "whatsapp" ? "_blank" : undefined}
                rel={channel.id === "whatsapp" ? "noopener noreferrer" : undefined}
                className={`support-popup-item support-channel-${channel.id}`}
              >
                <span>{channel.icon}</span>
                <div><small>{t(channel.eyebrow)}</small><strong>{t(channel.label)}</strong><p>{t(channel.desc)}</p></div>
                <ArrowUpRight size={18} />
              </a>
            ))}
          </div>

          <div className="support-popup-foot"><span><i /> {t("Şu anda çevrimiçiyiz")}</span><span><Clock3 size={13} /> {t("Ortalama 5 dk.")}</span></div>
        </div>
      )}

      {/* Rovi tanıtım balonu */}
      {showHint && !isOpen && (
        <button type="button" className="rovi-support-hint" onClick={() => { setShowHint(false); setIsOpen(true); }}>
          <strong>{t("Merhaba, ben Rovi! 👋")}</strong>
          <span>{t("Yardım lazım mı? Bana dokun.")}</span>
        </button>
      )}

      {/* Floating Button — canlı Rovi */}
      <button
        ref={btnRef}
        onClick={() => { setShowHint(false); handleToggle(); }}
        className={`support-bubble-btn support-bubble-btn--rovi ${isOpen && !isClosing ? "open" : ""}`}
        aria-label={t("Destek")}
        aria-expanded={isOpen && !isClosing}
        title={t("Rovi'ye sor")}
      >
        <span className="rovi-support-disc" aria-hidden="true" />
        <RoviMascot size={78} mood={isOpen && !isClosing ? "happy" : "idle"} interactive={false} alt="" className="rovi-support-figure" />
        <span className="rovi-support-badge" aria-hidden="true">
          {isOpen && !isClosing ? <X size={13} strokeWidth={3} /> : <MessageCircleMore size={13} strokeWidth={2.6} />}
        </span>
        <span className="rovi-support-online" aria-hidden="true" />
      </button>
    </>
  );
}
