import { redirect } from "@/i18n/server-navigation";

// WhatsApp şablonundaki "Randevu Değiştir" düğmesi: https://seninrandevun.com/randevu-degistir/<anahtar>
// Meta düğme bağlantısında değişkeni yalnız sonda kabul ettiği için ayrı adres; randevu sayfasında saat değiştirme penceresini açar.
export default async function RescheduleShortcut({ params }: { params: Promise<{ publicToken: string }> }) {
  const { publicToken } = await params;
  await redirect(`/randevu/${encodeURIComponent(publicToken)}?degistir=1`);
}
