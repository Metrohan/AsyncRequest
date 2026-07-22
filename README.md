> **Project Status: Active**
>
> This project is actively maintained. Current priorities and planned work are documented below or in GitHub Issues.

# Asenkron İstek İşleme ve Performans İzleme Servisi

Team A: Metehan GÜNEN, A. Baran DİKMEN, Neriman AKÇA, Mustafa YILDIRIM, H. Melih YEŞİL

## Genel Bakış

Bu proje, modern web uygulamalarında sıkça karşılaşılan uzun süren işlemleri ("örn. harici API çağrıları") kullanıcıyı bekletmeden asenkron olarak işleyen bir web servisi geliştirmeyi amaçlamaktadır. Ayrıca, servisin sağlık durumunu ve performansını gerçek zamanlı olarak izleyebilmek için metrik toplama yetenekleri de entegre edilmiştir.

> 📌 **Son Güncelleme (PR: `feature/k6-load-test-optimization`)**  
> K6 test senaryosu 202 durum kodunu tanıyacak şekilde optimize edildi. Gönderilen isteklerin sonucunu kontrol eden `status` endpoint'i için, arka planda işlem tamamlanana kadar tekrar eden sorgular (polling) eklendi. Bu sayede daha doğru başarı oranı hesaplandı ve önceki check hataları giderildi. Ayrıca Grafana üzerinden izlenebilen P95/P99 gibi uç değer metriklerine daha sağlıklı veri akışı sağlandı.

## Proje Amacı

* **Asenkron İşleme:** Gelen istekleri hızlıca kabul edip, asıl işleme mantığını arka plana taşıyarak kullanıcı deneyimini iyileştirmek.
* **Durum Takibi:** Arka planda işlenilen isteklerin mevcut durumunu sorgulayabilme yeteneği sağlamak.
* **Performans İzleme:** Uygulama performansını ve kaynak kullanımını izlemek için Prometheus metriklerini toplamak ve sunmak.
* **Docker Kullanımı:** Tüm bileşenleri (Node.js uygulaması, PostgreSQL veritabanı) izole, tutarlı ve taşınabilir Docker konteynerleri içinde çalıştırmak.

## Kullanılan Teknolojiler

* **Node.js & Express.js**
* **PostgreSQL**
* **Docker & Docker Compose**
* **Prometheus (`prom-client`)**
* **Grafana**
* **k6**
* **Diğer Kütüphaneler:** `pg`, `uuid`, `dotenv`, `axios`

## Güncellenen Mimari ve Özellikler

### 1. Değişmez (Immutable) Tasarım

- `src/domain/request.js` içinde immutable `Request` sınıfı tanımlandı.
- Nesne değişikliği yerine `with` metotları ile yeni örnekler üretiliyor.
- `Object.freeze()` ve `deep clone` teknikleriyle veri güvenliği sağlandı.

### 2. SOLID Uyumlu Modüler Yapı

- **Sabitler:** `src/config/constants.js` ile magic number ve stringler merkezileştirildi.
- **Özel Hata Sınıfları:** `src/utils/errors.js` altında kapsamlı hata sınıfları tanımlandı.
- **Servis Katmanı:** `src/services/requestService.js` ile iş mantığı `app.js`’ten ayrıldı.
- **Altyapı:** `src/infrastructure/` klasörü altında DB, mock servis ve metrikler ayrıştırıldı.

### 3. Merkezi Hata Yönetimi

- `app.js` içine global hata yakalayıcı middleware eklendi.
- Her hata sınıfı, anlamlı HTTP kodlarıyla istemciye geri dönüyor.

### 4. Kod Standartları

- **Adlandırmalar:** PascalCase (sınıf), camelCase (değişken), UPPER_SNAKE_CASE (sabit).
- **Kapsülleme:** `Request` sınıfında özel alanlar (`#`) ile iç durum gizlendi.
- **Bağımlılık Enjeksiyonu:** Test edilebilirliği artıracak şekilde uygulandı.

### 5. Altyapı ve Ortam Ayarları

- `.env`, `Dockerfile`, `docker-compose.yml`, `package.json` vb. dosyalar yeni yapıya uygun hale getirildi.
- PostgreSQL şeması `schema.sql` altında tutulmaktadır.

## Proje Yapısı

```
AsyncRequest/
├── load-tests/
│   └── submit-test.js                     # K6 ile yük testi senaryosu
│
├── node-app/
│   ├── domain/
│   │   └── request.js                     # Domain nesnesi tanımı
│   │
│   ├── handlers/
│   │   ├── status.js                      # /status handler
│   │   └── submit.js                      # /submit handler
│   │
│   ├── infrastructure/
│   │   ├── db.js                          # Veritabanı bağlantısı
│   │   ├── metrics.js                     # Prometheus metrik tanımları
│   │   └── mockService.js                 # Harici servis simülasyonu
│   │
│   ├── services/
│   │   └── requestService.js              # İş mantığı servisi
│   │
│   ├── src/
│   │   ├── config/
│   │   │   └── constants.js               # Sabitler
│   │   │
│   │   └── utils/
│   │       ├── errors.js                  # Özel hata sınıfları
│   │       └── logger.js                  # Loglama mantığı
│   │
│   ├── validators/
│   │   └── submitValidator.js             # Submit için doğrulayıcı
│   │
│   ├── app.js                             # Express sunucusu (main)
│   ├── .env                               # Ortam değişkenleri
│   ├── Dockerfile                         # Node.js Docker yapılandırması
│   ├── docker-compose.yml                 # Tüm bileşenlerin orkestrasyonu
│   ├── package.json                       # Bağımlılıklar ve script'ler
│   ├── package-lock.json                  # Bağımlılık kilidi                
├── prometheus.yml                         # Prometheus yapılandırması
├── schema.sql                             # PostgreSQL şema tanımı
└── README.md                              # Ana dokümantasyon


```


## Load Test

Yük testi senaryosu `k6` ile yazılmıştır. `submit-test.js` dosyasında:

- `POST /submit` çağrısı 202 döndüğünde geçerli sayılır.
- Dönen `requestId`, işlem tamamlanana kadar `GET /status/:id` ile 5 defaya kadar sorgulanır.
- Test sırasında polling uygulanarak başarı durumları daha doğru şekilde belirlenir.

```bash
cd ./load-tests/
docker run --rm -i -v ${PWD}:/scripts grafana/k6 run /scripts/submit-test.js
```

> ✅ Gözlemlenen İyileştirmeler:
> - `check failed` oranı azaldı
> - `status` endpoint'ine zamanında istek gönderilerek gerçek 200 yanıtları alınabildi
> - Prometheus üzerinden gözlemlenen `http_request_duration_seconds` metrikleri, `histogram_quantile` ile P95/P99 latency hesaplamalarına daha doğru veri sağladı

## Gelecek Planlar

- Test kapsamı ve merkezi loglama
- Dokümantasyon hazırlama ve raporlama