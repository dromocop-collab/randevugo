// Apple universal links dosyası. App Hosting public/.well-known klasörünü yayınlamadığı için
// /.well-known/apple-app-site-association bu route'a yeniden yazılır (next.config.ts).
const APP_ID = "G4KKMJ85R7.com.cihat.Senin-Randevun";

export const dynamic = "force-static";

export function GET() {
  return Response.json(
    {
      applinks: {
        details: [
          {
            appIDs: [APP_ID],
            components: [
              { "/": "/randevu/*", comment: "Randevu bileti" },
              { "/": "/isletme/*", comment: "İşletme vitrini ve randevu akışı" },
              { "/": "/randevularim*", comment: "Randevularım" },
              { "/": "/hesabim*", comment: "Müşteri hesabı" },
              { "/": "/siram*", comment: "Canlı sıra" },
            ],
          },
        ],
      },
      webcredentials: { apps: [APP_ID] },
    },
    { headers: { "Cache-Control": "public, max-age=300, must-revalidate" } },
  );
}
