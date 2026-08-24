import type { Metadata } from "next";
import { ProtectedRoute } from "@/lib/auth/protected-route";
import { OnboardingWizard } from "@/features/businesses/onboarding-wizard";

export const metadata: Metadata = {
  title: "İşletme Kurulumu | SeninRandevun",
  description: "Birkaç adımda işletmenizi oluşturun ve online randevuya başlayın.",
  robots: { index: false, follow: false },
};

export default function OnboardingPage() {
  return (
    <main className="onboarding-stage min-h-screen px-4 py-8 sm:py-14">
      <ProtectedRoute>
        <OnboardingWizard />
      </ProtectedRoute>
    </main>
  );
}
