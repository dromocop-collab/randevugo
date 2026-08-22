import { notFound } from "next/navigation";
import BusinessProfileClient from "./business-profile-client";
import { getBusinessBySlug, listBusinessWorkingHours } from "@/features/businesses/business-repository";
import { listServices } from "@/features/services/service-repository";
import { listStaff } from "@/features/staff/staff-repository";
import { listBusinessReviews } from "@/features/reviews/review-repository";
import { listServiceCategories } from "@/features/services/service-category-repository";
import { getDemoStorefrontBySlug } from "@/lib/demo-storefronts";

export const dynamic = "force-dynamic";

function serializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export default async function BusinessProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const demo = getDemoStorefrontBySlug(slug);
  if (demo) {
    return <BusinessProfileClient initialBusiness={demo.business} initialWorkingHours={demo.workingHours} initialServices={demo.services} initialStaff={demo.staff} initialReviews={[]} initialServiceCategories={demo.serviceCategories} isDemo />;
  }
  const business = await getBusinessBySlug(slug).catch(() => null);
  if (!business || business.status !== "active" || !business.isPublished) notFound();
  const [workingHours, services, staff, reviews, serviceCategories] = await Promise.all([
    listBusinessWorkingHours(business.id),
    listServices(business.id, true),
    listStaff(business.id, true),
    listBusinessReviews(business.id).catch(() => []),
    listServiceCategories(business.id).catch(() => []),
  ]);
  return <BusinessProfileClient initialBusiness={serializable(business)} initialWorkingHours={serializable(workingHours)} initialServices={serializable(services)} initialStaff={serializable(staff)} initialReviews={serializable(reviews)} initialServiceCategories={serializable(serviceCategories)} />;
}
