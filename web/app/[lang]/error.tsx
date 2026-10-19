"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import { RoviMascot } from "@/components/brand/rovi-mascot";
import { useT } from "@/i18n/client";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16">
      <div className="mb-4 flex justify-center"><RoviMascot size={140} mood="thinking" alt={t("Rovi sorunu inceliyor")} /></div>
      <ErrorState
        title={t("Beklenmeyen bir hata oluştu")}
        description={
          process.env.NODE_ENV === "development"
            ? error.message
            : t("Lütfen sayfayı yenileyin veya biraz sonra tekrar deneyin.")
        }
        action={<Button onClick={reset}>{t("Tekrar Dene")}</Button>}
      />
    </main>
  );
}
