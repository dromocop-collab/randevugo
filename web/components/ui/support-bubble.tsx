"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ArrowUpRight, Clock3, Headphones, Mail, MessageCircleMore, Phone, X } from "lucide-react";

const SUPPORT_CHANNELS = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    desc: "Hızlı mesaj gönderin",
    icon: <MessageCircleMore size={22} />,
    href: "https://wa.me/905304788298",
    eyebrow: "En hızlı kanal",
  },
  {
    id: "email",
    label: "E-posta",
    desc: "Detaylı destek talebi",
    icon: <Mail size={22} />,
    href: "mailto:info@seninrandevun.com",
    eyebrow: "Detaylı talepler",
  },
  {
    id: "phone",
    label: "Telefon",
    desc: "Hemen arayın",
    icon: <Phone size={22} />,
    href: "tel:+905304788298",
    eyebrow: "Doğrudan görüşme",
  },
];

export function SupportBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

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

  return (
    <>
      {/* Popup */}
      {isOpen && (
        <div
          ref={popupRef}
          className={`support-popup ${isClosing ? "closing" : ""}`}
          role="dialog"
          aria-label="SeninRandevun destek kanalları"
        >
          <div className="support-popup-head">
            <span><Headphones size={23} /></span>
            <div><small>CANLI DESTEK</small><strong>Yanındayız.</strong><p>İhtiyacına uygun kanalı seç, ekibimize hemen ulaş.</p></div>
            <button type="button" onClick={handleClose} aria-label="Destek penceresini kapat"><X size={17} /></button>
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
                <div><small>{channel.eyebrow}</small><strong>{channel.label}</strong><p>{channel.desc}</p></div>
                <ArrowUpRight size={18} />
              </a>
            ))}
          </div>

          <div className="support-popup-foot"><span><i /> Şu anda çevrimiçiyiz</span><span><Clock3 size={13} /> Ortalama 5 dk.</span></div>
        </div>
      )}

      {/* Floating Button */}
      <button
        ref={btnRef}
        onClick={handleToggle}
        className={`support-bubble-btn ${isOpen && !isClosing ? "open" : ""}`}
        aria-label="Destek"
        aria-expanded={isOpen && !isClosing}
        title="Bize Ulaşın"
      >
        {isOpen && !isClosing ? (
          <X size={25} />
        ) : (
          <MessageCircleMore size={26} />
        )}
      </button>
    </>
  );
}
