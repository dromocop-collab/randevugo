# RandevuGo

Multi-tenant profesyonel randevu SaaS platformu.

## Proje Yapisi

- `web/`: Next.js App Router uygulamasi
- `functions/`: Cloud Functions (TypeScript)
- `firestore.rules`: Firestore guvenlik kurallari
- `storage.rules`: Firebase Storage guvenlik kurallari

## Web Uygulamasi Calistirma

```bash
cd web
cp .env.example .env.local
# .env.local icine Firebase Web config degerlerini gir
npm install
npm run dev
```

Not: Login/Register icin Firebase Authentication Email/Password provider acik olmalidir.

## Firebase Kurallarini Deploy Etme

```bash
firebase deploy --only firestore:rules,storage
```

## Build Kontrolu

```bash
cd web
npm run lint
npm run build
```
