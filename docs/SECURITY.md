# Güvenlik yaklaşımı

- Tenant verileri `businesses/{businessId}` altında izole edilir.
- İşletme personeli rol tabanlı erişim kullanır.
- Randevu oluşturma doğrudan Firestore client yazımıyla yapılmaz.
- Randevu oluşturma `createAppointment` Callable Cloud Function üzerinden geçer.
- Çalışan/saat çakışması sunucu transaction'ı ile kontrol edilir.
- Audit loglar yalnızca sunucu tarafından oluşturulur.
- Hassas entegrasyon anahtarları client bundle'a konmamalıdır.
