"use client";

import { User, onAuthStateChanged } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getFirebaseAuth } from "@/features/auth/auth-service";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
}

const PUBLIC_PATHS = ["/", "/giris", "/kayit", "/sifremi-unuttum", "/kesfet", "/fiyatlandirma", "/isletmeler", "/ozellikler", "/fiyatlar", "/yardim-merkezi"];

const PUBLIC_PATH_PREFIXES = ["/randevu/", "/isletme/", "/musteri/", "/isletmeler/"];

const PROTECTED_PATH_PREFIXES = [
  "/admin",
  "/super-admin",
  "/dashboard",
  "/onboarding",
  "/hesabim",
];

const AuthContext = createContext<AuthContextValue>({
  user: null,
  status: "loading",
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const pathname = usePathname();
  const router = useRouter();
  // Track if auth state has been resolved at least once
  const authResolved = useRef(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setStatus(nextUser ? "authenticated" : "unauthenticated");
      authResolved.current = true;
    });

    return unsubscribe;
  }, []);

  // Redirect only after auth has been fully resolved
  useEffect(() => {
    // Don't redirect while loading or before auth has resolved
    if (status !== "unauthenticated" || !authResolved.current) return;

    // Don't redirect on public paths
    if (PUBLIC_PATHS.includes(pathname)) return;
    if (PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p))) return;

    // Only redirect on protected paths
    if (PROTECTED_PATH_PREFIXES.some((p) => pathname.startsWith(p))) {
      const loginPath = pathname.startsWith("/hesabim") ? "/musteri/giris" : "/isletmeler/giris";
      const requestedPath = `${pathname}${window.location.search}`;
      router.replace(`${loginPath}?next=${encodeURIComponent(requestedPath)}`);
    }
  }, [pathname, router, status]);

  const value = useMemo(
    () => ({
      user,
      status,
    }),
    [status, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  return useContext(AuthContext);
}
