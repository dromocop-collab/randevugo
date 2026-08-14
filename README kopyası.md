# RandevuGo Firebase Starter

RandevuGo için çok kiracılı (multi-tenant) randevu SaaS altyapısının Firebase başlangıç paketi.

## İçerik

- Firebase Authentication entegrasyonuna hazır yapı
- Cloud Firestore koleksiyon tasarımı
- Multi-tenant güvenlik kuralları
- Firestore indexleri
- Cloud Functions (TypeScript)
- Storage güvenlik kuralları
- Emulator ayarları
- Örnek seed scripti
- Ortam değişkeni örnekleri

## Koleksiyonlar

- `users`
- `businesses`
- `businesses/{businessId}/members`
- `businesses/{businessId}/branches`
- `businesses/{businessId}/staff`
- `businesses/{businessId}/services`
- `businesses/{businessId}/customers`
- `businesses/{businessId}/appointments`
- `businesses/{businessId}/workingHours`
- `businesses/{businessId}/notifications`
- `businesses/{businessId}/auditLogs`

## Başlangıç

```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase emulators:start
```

Functions:

```bash
cd functions
npm install
npm run build
cd ..
firebase deploy
```

> `.firebaserc.example` dosyasını `.firebaserc` olarak kopyalayıp Firebase proje kimliğini güncelle.
