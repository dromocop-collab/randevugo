// Android App Links doğrulaması (/.well-known/assetlinks.json → bu route, next.config.ts).
// Play Store sürümü Play App Signing anahtarıyla imzalanır (Play Console > Uygulama bütünlüğü).
const SHA256_FINGERPRINTS = [
  // Play App Signing (mağazadan inen sürüm)
  "8D:7E:D9:C4:33:83:0F:6B:57:47:AE:2C:E1:ED:BB:C3:76:FB:48:27:3F:E4:84:8D:EE:60:0D:65:2F:CC:D3:D3",
  // Yükleme (upload) anahtarı
  "DE:5F:72:B1:9C:D6:38:73:73:3C:1B:17:C8:6A:78:C1:17:E4:3B:AA:8A:B3:A8:6D:7A:03:F9:14:EA:2F:C8:CC",
];

export const dynamic = "force-static";

export function GET() {
  return Response.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls", "delegate_permission/common.get_login_creds"],
        target: { namespace: "android_app", package_name: "com.cihat.seninrandevun", sha256_cert_fingerprints: SHA256_FINGERPRINTS },
      },
    ],
    { headers: { "Cache-Control": "public, max-age=300, must-revalidate" } },
  );
}
