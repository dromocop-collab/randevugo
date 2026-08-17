"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

type Direction = "up" | "down" | "left" | "right" | "fade";

interface ScrollRevealProps {
  children: ReactNode;
  direction?: Direction;
  delay?: number;
  duration?: number;
  className?: string;
  as?: "div" | "section" | "article" | "aside" | "header" | "footer";
  once?: boolean;
  threshold?: number;
}

const directionClass: Record<Direction, string> = {
  up: "reveal-up",
  down: "reveal-down",
  left: "reveal-left",
  right: "reveal-right",
  fade: "reveal-fade",
};

export function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  duration,
  className,
  as: Tag = "div",
  once = true,
  threshold,
}: ScrollRevealProps) {
  const ref = useScrollReveal<HTMLDivElement>({ once, threshold });

  return (
    <Tag
      ref={ref}
      className={cn("scroll-reveal", directionClass[direction], className)}
      style={{
        transitionDelay: delay ? `${delay}ms` : undefined,
        transitionDuration: duration ? `${duration}ms` : undefined,
      }}
    >
      {children}
    </Tag>
  );
}
