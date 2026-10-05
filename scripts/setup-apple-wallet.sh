#!/usr/bin/env bash
# Apple Cüzdan kartı sertifikasını Firestore'a (platformPrivateSettings/appleWallet) yükler.
# Kullanım: scripts/setup-apple-wallet.sh <Pass-Type-ID-sertifikasi.p12> <pass.com.cihat.seninrandevun>
# .p12 şifresi bu terminalde sorulur; dosyaya/geçmişe yazılmaz. İstemci kuralları bu belgeyi okuyamaz.
set -euo pipefail

P12="${1:?.p12 dosya yolunu verin}"
PASS_TYPE_ID="${2:?Pass Type ID verin (ör. pass.com.cihat.seninrandevun)}"
TEAM_ID="${TEAM_ID:-G4KKMJ85R7}"
PROJECT="${PROJECT:-randevugo-d1d2e}"
ACCOUNT="${GCLOUD_ACCOUNT:-dromocop@gmail.com}"

read -r -s -p ".p12 şifresi: " P12_PASS; echo
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

openssl pkcs12 -legacy -in "$P12" -clcerts -nokeys -passin "pass:$P12_PASS" -out "$TMP/cert.pem" 2>/dev/null \
  || openssl pkcs12 -in "$P12" -clcerts -nokeys -passin "pass:$P12_PASS" -out "$TMP/cert.pem"
openssl pkcs12 -legacy -in "$P12" -nocerts -nodes -passin "pass:$P12_PASS" -out "$TMP/key.pem" 2>/dev/null \
  || openssl pkcs12 -in "$P12" -nocerts -nodes -passin "pass:$P12_PASS" -out "$TMP/key.pem"

SUBJECT="$(openssl x509 -in "$TMP/cert.pem" -noout -subject)"
echo "Sertifika: $SUBJECT"
case "$SUBJECT" in *"$PASS_TYPE_ID"*) ;; *) echo "UYARI: sertifika konusu $PASS_TYPE_ID içermiyor." ;; esac

BODY="$(python3 - "$TMP/cert.pem" "$TMP/key.pem" "$PASS_TYPE_ID" "$TEAM_ID" <<'PY'
import json, sys
cert = open(sys.argv[1]).read(); key = open(sys.argv[2]).read()
s = lambda v: {"stringValue": v}
print(json.dumps({"fields": {
  "enabled": {"booleanValue": True},
  "passTypeIdentifier": s(sys.argv[3]),
  "teamIdentifier": s(sys.argv[4]),
  "signerCertPem": s(cert),
  "signerKeyPem": s(key),
}}))
PY
)"

TOKEN="$(gcloud auth print-access-token "$ACCOUNT")"
curl -sf -X PATCH \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "https://firestore.googleapis.com/v1/projects/$PROJECT/databases/(default)/documents/platformPrivateSettings/appleWallet" \
  -d "$BODY" > /dev/null
echo "Tamam: Apple Cüzdan etkin. (Fonksiyon önbelleği en geç 10 dk içinde yenilenir.)"
