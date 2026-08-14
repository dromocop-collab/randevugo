# Veri Modeli

## users/{uid}
Kullanıcının genel hesap profili.

## businesses/{businessId}
İşletmenin ana tenant kaydı.

Önemli alanlar:
- `ownerUid`
- `name`
- `slug`
- `isPublished`
- `timezone`
- `currency`

## businesses/{businessId}/members/{uid}
İşletme rolü:
- owner
- admin
- manager
- staff

## branches
Şubeler.

## staff
Çalışanlar.

## services
Hizmetler:
- ad
- süre
- fiyat
- aktif/pasif
- sıralama

## customers
CRM müşteri kayıtları.

## appointments
Randevu kayıtları.

Çakışma kontrolü doğrudan client yerine Cloud Function'da yapılır.

## notifications
İşletme paneli bildirimleri.

## auditLogs
Kritik operasyonların değiştirilemez sunucu logları.
