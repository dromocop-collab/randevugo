"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { getBusinessById, getBusinessesForUser } from "@/features/businesses/business-repository";
import { endSupportSession, readSupportSession, SUPPORT_MODE_EVENT, type SupportSession } from "@/features/businesses/support-mode";
import type { Business } from "@/types/business";
import { userFacingError } from "@/lib/errors/user-facing-error";
import { useT } from "@/i18n/client";

interface BusinessContextValue {
  businesses: Business[];
  businessId: string | null;
  setBusinessId: (id: string) => void;
  refreshBusinesses: () => void;
  loading: boolean;
  /** Süper admin destek modunda açılan işletme (yalnız bu sekme). */
  support: SupportSession | null;
  access: {
    role: "owner" | "admin" | "manager" | "staff";
    staffId?: string;
    permissions: { manageOwnCalendar: boolean; viewCustomers: boolean; manageAppointments: boolean; manageCheckout: boolean; manageCatalog: boolean; managePackages: boolean; manageFinance: boolean };
  } | null;
}

const STORAGE_KEY = "randevugo-business-id";

const BusinessContext = createContext<BusinessContextValue>({
  businesses: [],
  businessId: null,
  setBusinessId: () => undefined,
  refreshBusinesses: () => undefined,
  loading: true,
  support: null,
  access: null,
});

function getStoredBusinessId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const t = useT();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessIdState] = useState<string | null>(getStoredBusinessId);
  const [loading, setLoading] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [support, setSupport] = useState<SupportSession | null>(null);
  const [supportBusiness, setSupportBusiness] = useState<Business | null>(null);

  useEffect(() => {
    const sync = () => setSupport(readSupportSession());
    sync();
    window.addEventListener(SUPPORT_MODE_EVENT, sync);
    return () => window.removeEventListener(SUPPORT_MODE_EVENT, sync);
  }, []);

  // Destek modu: işletme belgesi doğrudan okunur (kurallar süper admine izin verir); üyelik yazılmaz.
  useEffect(() => {
    if (status !== "authenticated" || !user || !support) {
      queueMicrotask(() => setSupportBusiness(null));
      return;
    }
    let alive = true;
    getBusinessById(support.businessId)
      .then((business) => {
        if (!alive) return;
        if (!business) {
          endSupportSession();
          toast.error("Destek modu açılamadı: işletme bulunamadı.");
          return;
        }
        setSupportBusiness({ ...business, currentUserRole: "owner", currentStaffId: undefined, currentPermissions: undefined });
      })
      .catch(() => {
        if (!alive) return;
        endSupportSession();
        toast.error("Destek modu yalnız süper admin hesabıyla açılabilir.");
      });
    return () => {
      alive = false;
    };
  }, [status, user, support, refreshCounter]);

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
          setBusinessIdState((prev) => {
            const next = prev && rows.some((business) => business.id === prev)
              ? prev
              : rows[0]!.id;
            window.localStorage.setItem(STORAGE_KEY, next);
            return next;
          });
        }
      })
      .catch((error) => {
        if (!alive) return;
        setBusinesses([]);
        const code = (error as { code?: string })?.code;
        if (code === "permission-denied" || code === "PERMISSION_DENIED") {
          return;
        }
        const message = userFacingError(error, t("İşletme listeniz şu anda alınamadı. Lütfen yeniden deneyin."));
        toast.error(t(message));
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [status, user, refreshCounter, t]);

  const setBusinessId = useCallback((id: string) => {
    // Başka işletmeye geçmek destek modunu kapatır.
    if (readSupportSession()?.businessId !== id) endSupportSession();
    window.localStorage.setItem(STORAGE_KEY, id);
    setBusinessIdState(id);
    // Trigger a refetch so businesses array is populated
    setRefreshCounter((c) => c + 1);
  }, []);

  const refreshBusinesses = useCallback(() => {
    setRefreshCounter((c) => c + 1);
  }, []);

  const value = useMemo(
    (): BusinessContextValue => {
      const isAuthenticated = status === "authenticated" && !!user;
      const supportActive = isAuthenticated && support !== null;
      const visible = supportActive && supportBusiness
        ? [supportBusiness, ...businesses.filter((business) => business.id !== supportBusiness.id)]
        : businesses;
      const activeId = supportActive ? support.businessId : businessId;

      return {
        businesses: isAuthenticated ? visible : [],
        businessId: isAuthenticated ? activeId : null,
        setBusinessId,
        refreshBusinesses,
        // Destek işletmesi gelene kadar panel kendi işletmeni göstermesin.
        loading: status === "loading" || (isAuthenticated && (loading || (supportActive && !supportBusiness))),
        support: supportActive ? support : null,
        access: (() => {
          const active = visible.find((business) => business.id === activeId) ?? visible[0];
          if (!isAuthenticated || !active) return null;
          return {
            role: active.currentUserRole ?? "owner",
            staffId: active.currentStaffId,
            permissions: {
              manageOwnCalendar: active.currentPermissions?.manageOwnCalendar ?? true,
              viewCustomers: active.currentPermissions?.viewCustomers ?? false,
              manageAppointments: active.currentPermissions?.manageAppointments ?? false,
              manageCheckout: active.currentPermissions?.manageCheckout ?? false,
              manageCatalog: active.currentPermissions?.manageCatalog ?? false,
              managePackages: active.currentPermissions?.managePackages ?? false,
              manageFinance: active.currentPermissions?.manageFinance ?? false,
            },
          };
        })(),
      };
    },
    [businessId, businesses, loading, refreshBusinesses, setBusinessId, status, support, supportBusiness, user]
  );

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusinessContext() {
  return useContext(BusinessContext);
}
