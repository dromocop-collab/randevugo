# RandevuGo Web

Next.js + Firebase App Hosting uyumlu multi-tenant randevu paneli.

## Ortam Degiskenleri

`web/.env.example` dosyasini `web/.env.local` olarak kopyalayin ve Firebase Web config degerlerini doldurun.

```bash
cp .env.example .env.local
```

Gerekli alanlar:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Alternatif olarak tek JSON:

- `NEXT_PUBLIC_FIREBASE_CONFIG`

## Calistirma

```bash
npm install
npm run dev
```

## Kalite Kontrol

```bash
npm run lint
npm run build
```

## Notlar

- Email/Password giris icin Firebase Authentication provider acik olmalidir.
- Firestore ve Storage guvenlik kurallari repo kokundeki dosyalardan yonetilir.
