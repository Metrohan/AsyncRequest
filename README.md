# Asenkron İstek İşleme ve Performans İzleme Servisi

## Genel Bakış

Bu proje, modern web uygulamalarında sıkça karşılaşılan uzun süren işlemleri ("örn. harici API çağrıları") kullanıcıyı bekletmeden asenkron olarak işleyen bir web servisi geliştirmeyi amaçlamaktadır. Ayrıca, servisin sağlık durumunu ve performansını gerçek zamanlı olarak izleyebilmek için metrik toplama yetenekleri de entegre edilmiştir.

## Proje Amacı

* **Asenkron İşleme:** Gelen istekleri hızlıca kabul edip, asıl işleme mantığını arka plana taşıyarak kullanıcı deneyimini iyileştirmek.
* **Durum Takibi:** Arka planda işlenen isteklerin mevcut durumunu sorgulayabilme yeteneği sağlamak.
* **Performans İzleme:** Uygulama performansını ve kaynak kullanımını izlemek için Prometheus metriklerini toplamak ve sunmak.
* **Docker Kullanımı:** Tüm bileşenleri (Node.js uygulaması, PostgreSQL veritabanı) izole, tutarlı ve taşınabilir Docker konteynerleri içinde çalıştırmak.

## Kullanılan Teknolojiler

* **Node.js & Express.js:** Hızlı ve ölçeklenebilir web servisi geliştirmek için.
* **PostgreSQL:** Güvenilir bir ilişkisel veritabanı olarak istek bilgilerini saklamak için.
* **Docker & Docker Compose:** Geliştirme, test ve dağıtım ortamı tutarlılığını sağlamak, kurulumu kolaylaştırmak için.
* **Prometheus (prom-client):** Uygulama metriklerini toplamak ve izleme sistemlerine sunmak için.
* **Diğer Kütüphaneler:** `pg` (PostgreSQL bağlantısı), `uuid` (benzersiz ID oluşturma), `dotenv` (ortam değişkenleri), `axios` (HTTP istekleri, eğer mock servis yerine gerçek bir servis çağrılacaksa).

## Proje Yapısı

```
AsyncRequest/
├── docker-compose.yml              # Docker servislerinin (DB, Uygulama) orkestrasyonu
├── schema.sql                      # PostgreSQL veritabanı şeması tanımı (requests tablosu)
└── node-app/                       # Node.js uygulamasının bulunduğu klasör
    ├── package.json                # Node.js proje bağımlılıkları ve scriptleri
    ├── .env                        # Uygulama ortam değişkenleri (DB bilgileri, port, mock gecikmeleri)
    ├── Dockerfile                  # Node.js uygulamasını Docker imajına dönüştürme talimatları
    └── src/                        # Ana uygulama kaynak kodları
        ├── app.js                  # Express.js sunucusu, API endpointleri (/submit, /status, /metrics) ve ana iş mantığı
        ├── db.js                   # PostgreSQL veritabanı etkileşimleri ve bağlantı havuzu yönetimi
        ├── mockService.js          # Harici 3. parti servis çağrısını simüle eden modül
        └── metrics.js              # Prometheus metriklerinin tanımları ve toplama mantığı
```

## Kurulum ve Çalıştırma

Projenizi yerel makinenizde kurmak ve çalıştırmak için aşağıdaki adımları izleyin:

### Önkoşullar

* [**Node.js (LTS)**](https://nodejs.org/en/download/)
* [**Git**](https://git-scm.com/downloads)
* [**Docker Desktop (Windows/macOS) veya Docker Engine & Compose (Linux)**](https://www.docker.com/products/docker-desktop/)

### Adımlar

1.  **Projeyi Klonlayın:**
    ```bash
    git clone https://github.com/Metrohan/AsyncRequest.git
    cd AsyncRequest
    ```

2.  **Docker Ortamını Başlatın:**
    Projenin kök dizininde (`AsyncRequest/` klasöründe) aşağıdaki komutu çalıştırarak PostgreSQL veritabanı ve Node.js uygulamasını Docker konteynerleri olarak başlatın:
    ```bash
    docker compose up -d
    ```
    Bu komut, Node.js uygulamasının bağımlılıklarını kuracak, Docker imajlarını oluşturacak ve servisleri arka planda çalıştıracaktır.

3.  **Konteyner Durumunu Kontrol Edin:**
    Tüm servislerin çalıştığından emin olmak için:
    ```bash
    docker compose ps
    ```
    `db` ve `node_app` servislerinin `Up` durumda olması gerekir.

## Servisi Test Etme

Uygulama `http://localhost:3001` adresinde çalışıyor olacaktır. İstek göndermek için bir terminal (Git Bash veya PowerShell) kullanabilirsiniz.

### 1. Asenkron İstek Gönderme (`/submit` POST)

Bir işlem başlatmak ve anında bir `requestId` almak için:

**PowerShell:**
```powershell
Invoke-RestMethod -Uri http://localhost:3001/submit -Method Post -ContentType "application/json" -Body '{"veri": "ornek_veri", "tip": "tip-a"}'
```

**Git Bash / cURL:**
```bash
curl -X POST -H "Content-Type: application/json" -d '{"veri": "ornek_veri", "tip": "tip-a"}' http://localhost:3001/submit
```

Dönen yanıttaki `requestId` değerini kopyalayın.

### 2. İstek Durumunu Sorgulama (`/status/{id}` GET)

Kopyaladığınız `requestId` ile isteğin güncel durumunu kontrol edin:

**PowerShell:**
```powershell
$requestId = "buraya-kopyaladığınız-requestId-gelecek"
Invoke-RestMethod -Uri "http://localhost:3001/status/$requestId" -Method Get
```

**Git Bash / cURL:**
```bash
curl http://localhost:3001/status/buraya-kopyaladığınız-requestId-gelecek
```

İlk başta `status: "pending"` görebilirsiniz. Birkaç saniye sonra tekrar sorguladığınızda `status: "completed"` veya `status: "failed"` olarak değiştiğini göreceksiniz.

### 3. Prometheus Metriklerini Görüntüleme (`/metrics` GET)

Uygulamanızın performans metriklerini görmek için tarayıcınızdan veya terminalden erişin:

**Tarayıcı:**
```
http://localhost:3001/metrics
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri http://localhost:3001/metrics -Method Get
```

**Git Bash / cURL:**
```bash
curl http://localhost:3001/metrics
```

Bu çıktı, uygulamanızın topladığı çeşitli performans metriklerini (HTTP istek sayıları, süreleri, veritabanı bağlantı havuzu kullanımı vb.) gösterecektir.

## Gelecek Planlar

* Prometheus ve Grafana ile metrik görselleştirilmesi.
* Gerçek bir mesaj kuyruğu ("örn. RabbitMQ, Kafka") entegrasyonu.
* Mock servis yerine gerçek bir 3. parti API ile entegrasyon.
* Gelişmiş hata yönetimi ve merkezi loglama.