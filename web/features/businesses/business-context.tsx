"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { getBusinessesForUser } from "@/features/businesses/business-repository";
import type { Business } from "@/types/business";

interface BusinessContextValue {
  businesses: Business[];
  businessId: string | null;
  setBusinessId: (id: string) => void;
  loading: boolean;
}

const STORAGE_KEY = "randevugo-business-id";

const BusinessContext = createContext<BusinessContextValue>({
  businesses: [],
  businessId: null,
  setBusinessId: () => undefined,
  loading: true,
});

function getStoredBusinessId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessIdState] = useState<string | null>(getStoredBusinessId);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !user) return;

    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      setLoading(true);
    });

    getBusinessesForUser(user.uid)
      .then((rows) => {
        if (!alive) return;
        setBusinesses(rows);
        if (rows.length > 0) {
          setBusinessIdState((prev) => prev ?? rows[0]!.id);
        }
      })
      .catch((error) => {
        if (!alive) return;
        setBusinesses([]);
        const message = (error as Error | undefined)?.message ?? "Isletme listesi alinirken hata olustu.";
        toast.error(message);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [status, user]);

  const setBusinessId = (id: string) => {
    window.localStorage.setItem(STORAGE_KEY, id);
    setBusinessIdState(id);
  };

  const value = useMemo(
    (): BusinessContextValue => {
      const isAuthenticated = status === "authenticated" && !!user;

      return {
        businesses: isAuthenticated ? businesses : [],
        businessId: isAuthenticated ? businessId : null,
        setBusinessId,
        loading: status === "loading" || (isAuthenticated && loading),
      };
    },
    [businessId, businesses, loading, status, user]
  );

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusinessContext() {
  return useContext(BusinessContext);
}
