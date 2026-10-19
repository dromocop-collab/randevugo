import type { ComponentType } from "react";
import { createElement } from "react";
import {
  BicepsFlexed, Brain, BriefcaseBusiness, ChartNoAxesCombined, ClipboardList,
  Droplets, Dumbbell, Eye, FileText, Gem, Globe2, GraduationCap, HandHeart,
  Laptop, Link2, Palette, PawPrint, PersonStanding, Rainbow, Scale, Scissors,
  Smile, Sparkles, Stethoscope, Syringe, UserRound, WandSparkles, Wind, Wrench,
} from "lucide-react";

type IconComponent = ComponentType<{ size?: number; strokeWidth?: number; className?: string; "aria-hidden"?: boolean }>;

const ICON_MAP: Record<string, IconComponent> = {
  "✂️": Scissors, "🎨": Palette, "💆": HandHeart, "💅": WandSparkles,
  "🏋️": Dumbbell, "🩺": Stethoscope, "📋": ClipboardList, "🐾": PawPrint,
  "📚": GraduationCap, "🔧": Wrench, "💄": WandSparkles, "🧴": Droplets,
  "👁️": Eye, "🦷": Smile, "💉": Syringe, "🧘": PersonStanding,
  "🪒": Scissors, "🧔": UserRound, "💨": Wind, "🌈": Rainbow,
  "✨": Sparkles, "🔗": Link2, "👰": Gem, "🥊": BicepsFlexed,
  "💪": BicepsFlexed, "🧠": Brain, "💼": BriefcaseBusiness, "⚖️": Scale,
  "📊": ChartNoAxesCombined, "🌍": Globe2, "💻": Laptop, "📝": FileText,
};

// Kategori adındaki Türkçe anahtar kelimelerden simge seçer (veri eşleştirme, görünen metin değil).
function iconForName(name: string): IconComponent {
  const normalized = name.toLocaleLowerCase("tr-TR");
  if (normalized.includes("web") || normalized.includes("yazılım") || normalized.includes("mobil")) return Laptop; // i18n-ignore
  if (normalized.includes("spor") || normalized.includes("fitness")) return Dumbbell;
  if (normalized.includes("sağlık") || normalized.includes("klinik")) return Stethoscope; // i18n-ignore
  if (normalized.includes("veteriner")) return PawPrint;
  if (normalized.includes("eğitim")) return GraduationCap; // i18n-ignore
  if (normalized.includes("danış")) return BriefcaseBusiness; // i18n-ignore
  if (normalized.includes("güzellik") || normalized.includes("bakım")) return Sparkles; // i18n-ignore
  if (normalized.includes("saç") || normalized.includes("berber") || normalized.includes("kuaför")) return Scissors; // i18n-ignore
  return Sparkles;
}

export function ServiceCategoryIcon({ icon, name = "", size = 20, className }: { icon?: string; name?: string; size?: number; className?: string }) {
  const Icon = (icon && ICON_MAP[icon]) || iconForName(name);
  return createElement(Icon, { "aria-hidden": true, size, strokeWidth: 1.9, className });
}
