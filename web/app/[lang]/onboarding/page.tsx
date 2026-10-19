import type { Metadata } from "next";
import { getT } from "@/i18n/server";
import { ProtectedRoute } from "@/lib/auth/protected-route";
import { OnboardingWizard } from "@/features/businesses/onboarding-wizard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("İşletme Kurulumu"),
    description: t("Birkaç adımda işletmenizi oluşturun ve online randevuya başlayın."),
    robots: { index: false, follow: false },
  };
}

export default function OnboardingPage() {
  return (
    <main className="onboarding-stage min-h-screen px-4 py-8 sm:py-14">
      <ProtectedRoute>
        <OnboardingWizard />
      </ProtectedRoute>
    </main>
  );
}
