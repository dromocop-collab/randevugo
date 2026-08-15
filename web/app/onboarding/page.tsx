import type { Metadata } from "next";
import { ProtectedRoute } from "@/lib/auth/protected-route";
import { OnboardingWizard } from "@/features/businesses/onboarding-wizard";

export const metadata: Metadata = {
  title: "İşletme Kurulumu | SeninRandevun",
  description: "Birkaç adımda işletmenizi oluşturun ve online randevuya başlayın.",
};

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,var(--surface-0),var(--surface-1))] px-4 py-10 sm:py-16">
      <ProtectedRoute>
        <OnboardingWizard />
      </ProtectedRoute>
    </main>
  );
}
