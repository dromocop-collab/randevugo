"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16">
      <ErrorState
        title="Beklenmeyen bir hata olustu"
        description={
          process.env.NODE_ENV === "development"
            ? error.message
            : "Lutfen sayfayi yenileyin veya biraz sonra tekrar deneyin."
        }
        action={<Button onClick={reset}>Tekrar Dene</Button>}
      />
    </main>
  );
}
