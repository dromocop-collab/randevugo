"use client";

import { User, onAuthStateChanged } from "firebase/auth";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getFirebaseAuth } from "@/features/auth/auth-service";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
}

const PUBLIC_PATHS = ["/", "/giris", "/kayit", "/sifremi-unuttum"];

const AuthContext = createContext<AuthContextValue>({
  user: null,
  status: "loading",
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setStatus(nextUser ? "authenticated" : "unauthenticated");
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (status !== "unauthenticated") return;
    if (PUBLIC_PATHS.includes(pathname)) return;
    if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding")) {
      router.replace("/giris");
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
