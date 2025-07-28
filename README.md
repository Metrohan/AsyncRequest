# Asenkron İstek İşleme ve Performans İzleme Servisi

Team A: Metehan GÜNEN, A. Baran DİKMEN, Neriman AKÇA, Mustafa YILDIRIM, H. Melih YEŞİL

## Genel Bakış

Bu proje, modern web uygulamalarında sıkça karşılaşılan uzun süren işlemleri ("örn. harici API çağrıları") kullanıcıyı bekletmeden asenkron olarak işleyen bir web servisi geliştirmeyi amaçlamaktadır. Ayrıca, servisin sağlık durumunu ve performansını gerçek zamanlı olarak izleyebilmek için metrik toplama yetenekleri de entegre edilmiştir.

> 📌 **Son Güncelleme (PR: `feature/k6-load-test-implementation`)**  
> Web servisinin darboğaz, CPU kullanımı, Memory kullanımı, P50, P95, P99 gibi metriklerini gözlemleyebilmek için Grafana ve k6 entegre edilmiştir. Bu yenilikte Grafana ile grafik takibi kolaylaşmış olup k6 ile load testing esnasında hangi durumlarda darboğaz yaşandığı rahatlıkla gözlemlenebilmektedir.

## Proje Amacı

* **Asenkron İşleme:** Gelen istekleri hızlıca kabul edip, asıl işleme mantığını arka plana taşıyarak kullanıcı deneyimini iyileştirmek.
* **Durum Takibi:** Arka planda işlenen isteklerin mevcut durumunu sorgulayabilme yeteneği sağlamak.
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
├── docker-compose.yml              # Docker servislerinin (DB, Uygulama, Prometheus, Grafana) orkestrasyonu
├── prometheus.yml                  # Prometheus'un hangi servislerden metrik toplayacağını yapılandıran dosya
├── schema.sql                      # PostgreSQL veritabanı şeması tanımı
└── load-tests/                     # Load testin bulunduğu klasör
    └──submit-test.js               # k6 ile yapılmış Load Test talimatları                     
└── node-app/                       # Ana Node.js uygulamasının bulunduğu klasör
    ├── Dockerfile                  # Node.js uygulamasını Docker imajına dönüştürme talimatları
    ├── .env                        # Uygulama ortam değişkenleri
    ├── package.json                # Node.js proje bağımlılıkları ve scriptleri
    └── src/                        # Ana uygulama kaynak kodları
        ├── app.js                  # Express.js sunucusu, API endpointleri ve ana iş mantığı
        ├── config/
        │   └── constants.js        # Uygulama genelinde kullanılacak sabitler (örn. port, gecikmeler, durum tipleri)
        ├── domain/
        │   └── request.js          # İstek nesnesinin veya modellerinin tanımları (örn. Request sınıfı/interface)
        ├── infrastructure/
        │   ├── db.js               # Veritabanı etkileşimleri ve bağlantı havuzu yönetimi
        │   ├── metrics.js          # Prometheus metriklerinin tanımları ve toplama mantığı (Node.js uygulamanızın metriklerini dışa aktaran kısım)
        │   └── mockService.js      # Harici 3. parti servis çağrısını simüle eden modül
        ├── services/
        │   └── requestService.js   # İş mantığını içeren servis katmanı (örn. istek işleme, durum güncelleme, domain nesnelerini kullanma)
        └── utils/
            └── errors.js           # Uygulama genelinde kullanılacak özel hata sınıfları veya hata yardımcı fonksiyonları
```

## Kurulum ve Çalıştırma

### Önkoşullar

* Node.js
* Git
* Docker & Docker Compose

### Adımlar

```bash
git clone https://github.com/Metrohan/AsyncRequest.git
cd AsyncRequest
docker compose up -d
```

## Servisi Test Etme

### 1. `/submit` → POST  
İstek başlatır, `requestId` döner.

### 2. `/status/{id}` → GET  
İstek durumu sorgulanır: `pending`, `completed`, `failed`

### 3. `/metrics` → GET  
Prometheus metrikleri görüntülenir.

## Load Test

```bash
docker run --rm -i -v $PWD:/scripts grafana/k6 run /scripts/submit-test.js
```

## Gelecek Planlar

- Test kapsamı ve merkezi loglama
- Dokümantasyon hazırlama ve raporlama
---

## Gözden Geçirme Notları

- `Request` sınıfındaki immutable yapı detaylarını inceleyin.
- `src/services/requestService.js` içindeki iş mantığını gözden geçirin.
- `src/utils/errors.js` ile hata yönetimi netleşmiştir.
- Testler ilerleyen sürümlerde genişletilecektir.
