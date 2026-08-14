import type { Metadata } from "next";
import { ProtectedRoute } from "@/lib/auth/protected-route";
import { OnboardingWizard } from "@/features/businesses/onboarding-wizard";

export const metadata: Metadata = {
  title: "Onboarding | RandevuGo",
  description: "Isletme kurulum adimlarini tamamlayin.",
};

export default function OnboardingPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <ProtectedRoute>
        <OnboardingWizard />
      </ProtectedRoute>
    </main>
  );
}
