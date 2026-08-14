"use client";

import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { LoadingState } from "@/components/ui/states";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === "loading") {
    return <LoadingState title="Oturum kontrol ediliyor" description="Paneliniz yukleniyor." />;
  }

  if (status === "unauthenticated") {
    return null;
  }

  return <>{children}</>;
}
