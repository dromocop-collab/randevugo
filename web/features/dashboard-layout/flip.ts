// FLIP animasyonu: yer/boyut değiştiren kartlar eski konumlarından yenisine akar.
// Kullanım: değişiklikten hemen önce captureRects(), DOM güncellenince (useLayoutEffect) playFlip().
// Yalnız transform + clip-path canlandırılır; yerleşimi (layout) etkilemez, içerik ezilip bükülmez.

export type RectMap = Map<string, DOMRect>;

const ATTR = "data-flip-id";

export function captureRects(root: HTMLElement | null): RectMap {
  const map: RectMap = new Map();
  root?.querySelectorAll<HTMLElement>(`[${ATTR}]`).forEach((element) => {
    map.set(element.getAttribute(ATTR)!, element.getBoundingClientRect());
  });
  return map;
}

export function motionAllowed() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  return document.documentElement.dataset.dashboardMotion !== "calm";
}

export function playFlip(root: HTMLElement | null, before: RectMap, options: { duration?: number; skip?: string | null } = {}) {
  if (!root || !before.size || !motionAllowed()) return;
  const duration = options.duration ?? 420;
  const easing = "cubic-bezier(0.22, 1, 0.36, 1)";
  root.querySelectorAll<HTMLElement>(`[${ATTR}]`).forEach((element) => {
    const id = element.getAttribute(ATTR)!;
    if (id === options.skip) return;
    element.getAnimations?.().forEach((animation) => animation.cancel());
    const after = element.getBoundingClientRect();
    const old = before.get(id);
    if (!old) {
      element.animate([{ opacity: 0, transform: "translateY(10px) scale(0.98)" }, { opacity: 1, transform: "none" }], { duration, easing });
      return;
    }
    const dx = old.left - after.left;
    const dy = old.top - after.top;
    const growX = Math.max(0, after.width - old.width);
    const growY = Math.max(0, after.height - old.height);
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && growX < 1 && growY < 1) return;
    const radius = getComputedStyle((element.firstElementChild as HTMLElement | null) ?? element).borderTopLeftRadius || "0px";
    // Büyüyen kart eski boyutundan açılır (clip-path); küçülen kart yalnız kayar.
    const keyframes: Keyframe[] = growX || growY
      ? [
          { transform: `translate(${dx}px, ${dy}px)`, clipPath: `inset(0px ${growX}px ${growY}px 0px round ${radius})` },
          { transform: "translate(0px, 0px)", clipPath: `inset(0px 0px 0px 0px round ${radius})` },
        ]
      : [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0px, 0px)" }];
    element.animate(keyframes, { duration, easing });
  });
}
