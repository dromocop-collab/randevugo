"use client";

import { useState, useCallback, useEffect, useRef } from "react";

const SUPPORT_CHANNELS = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    desc: "Hızlı mesaj gönderin",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
    href: "https://wa.me/905304788298",
    color: "text-green-500",
    bgHover: "hover:bg-green-500/5",
  },
  {
    id: "email",
    label: "E-posta",
    desc: "Detaylı destek talebi",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
    href: "mailto:info@seninrandevun.com",
    color: "text-blue-500",
    bgHover: "hover:bg-blue-500/5",
  },
  {
    id: "phone",
    label: "Telefon",
    desc: "Hemen arayın",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
      </svg>
    ),
    href: "tel:+905304788298",
    color: "text-violet-500",
    bgHover: "hover:bg-violet-500/5",
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
          className={`support-popup glass-premium ${isClosing ? "closing" : ""}`}
        >
          {/* Header */}
          <div className="border-b border-[var(--border)] bg-[linear-gradient(135deg,var(--accent)/8,var(--accent-3)/5)] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,var(--accent),var(--accent-3))] text-white shadow-lg">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--text-1)]">Yardıma mı ihtiyacınız var?</p>
                <p className="text-xs text-[var(--text-3)]">Size nasıl yardımcı olabiliriz?</p>
              </div>
            </div>
          </div>

          {/* Channels */}
          <div className="p-2">
            {SUPPORT_CHANNELS.map((channel) => (
              <a
                key={channel.id}
                href={channel.href}
                target={channel.id === "whatsapp" ? "_blank" : undefined}
                rel={channel.id === "whatsapp" ? "noopener noreferrer" : undefined}
                className={`support-popup-item flex items-center gap-3 rounded-xl px-4 py-3 ${channel.bgHover}`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] ${channel.color}`}>
                  {channel.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-1)]">{channel.label}</p>
                  <p className="text-xs text-[var(--text-3)]">{channel.desc}</p>
                </div>
                <svg className="ml-auto h-4 w-4 text-[var(--text-3)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </a>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--border)] px-5 py-3">
            <p className="text-center text-[10px] text-[var(--text-3)]">
              Yanıt süresi: Genellikle 5 dakika içinde
            </p>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        ref={btnRef}
        onClick={handleToggle}
        className={`support-bubble-btn ${isOpen && !isClosing ? "open" : ""}`}
        aria-label="Destek"
        title="Bize Ulaşın"
      >
        {isOpen && !isClosing ? (
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
        )}
      </button>
    </>
  );
}
