"use client";

import { ReactNode } from "react";
import { AuthProvider } from "@/features/auth/auth-context";
import { BusinessProvider } from "@/features/businesses/business-context";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { ToastProvider } from "@/components/ui/toast-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BusinessProvider>
          {children}
          <ToastProvider />
        </BusinessProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
