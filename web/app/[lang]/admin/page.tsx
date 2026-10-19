import { redirect } from "@/i18n/server-navigation";

export default async function AdminPage() {
  await redirect("/super-admin");
}
