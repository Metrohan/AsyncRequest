// node-app/src/app.js

require('dotenv').config(); // Ortam değişkenlerini .env dosyasından yükle

const express = require('express'); //
const { v4: uuidv4, validate: isUuid } = require('uuid'); //
const { APP_PORT, HTTP_REQUEST_BODY_LIMIT, UUID_VERSION } = require('./config/constants'); // Sabitler merkezi yerden alınıyor
const { InvalidInputError, NotFoundError, AppError } = require('./utils/errors'); // Hata sınıfları
const {
    register,
    httpRequestCounter,
    httpRequestDurationSeconds,
    updateDbPoolMetrics
} = require('./infrastructure/metrics'); // Metrikler
const RequestService = require('./services/requestService'); // Yeni RequestService

const app = express();
// JSON body parser, limit belirtilebilir.
app.use(express.json({ limit: HTTP_REQUEST_BODY_LIMIT })); //

// Bağımlılık Enjeksiyonu: RequestService örneği oluştur
const requestService = new RequestService();

// --- Middleware'ler ---
// HTTP istek metrikleri middleware'i
app.use((req, res, next) => { //
    const end = httpRequestDurationSeconds.startTimer(); //
    res.on('finish', () => { //
        // req.route.path, dinamik rotalar için tanımlanır, aksi halde req.path kullan
        const routePath = req.route ? req.route.path : req.path;
        httpRequestCounter.inc({
            method: req.method, //
            route: routePath, //
            code: res.statusCode //
        });
        end({
            method: req.method, //
            route: routePath, //
            code: res.statusCode //
        });
    });
    next(); //
});

// --- Endpoint Tanımlamaları ---

/**
 * Yeni bir istek gönderir ve işlenmek üzere kabul eder.
 * @route POST /submit
 * @body {object} payload - İşlenecek veri.
 * @returns {object} requestId ve kabul mesajı.
 * @throws {InvalidInputError} Boş veya geçersiz yük.
 * @throws {AppError} Dahili sunucu hataları.
 */
app.post('/submit', async (req, res, next) => { //
    const requestId = uuidv4(); //
    const payload = req.body; //

    if (!payload || Object.keys(payload).length === 0) { //
        console.warn(`[${requestId}] Empty or missing payload: /submit`); //
        return next(new InvalidInputError('Request payload cannot be empty.')); // Hata middleware'ine yönlendir
    }

    try {
        // İstek veritabanına kaydedilir (pending durumda)
        const initialRequest = await requestService.createRequest(requestId, payload); // İş mantığı RequestService'e delege edildi

        // API yanıtı hemen döndürülür
        res.status(202).json({
            requestId: initialRequest.getId(),
            message: 'Request accepted for processing.'
        }); //

        // 3. parti servis çağrısı ve durum güncellemesi arka planda asenkron olarak yapılır
        // Bu, API yanıtının hızlı olmasını sağlar.
        // Hatalar sadece loglanır, çünkü yanıt zaten gönderilmiştir.
        requestService.processRequestAsync(initialRequest)
            .catch(error => {
                console.error(`[${requestId}] Asynchronous processing failed:`, error.message, error.stack);
                // Burada daha gelişmiş bir hata bildirimi/yeniden deneme mekanizması eklenebilir.
            });

    } catch (error) {
        // Yakalanan hataları merkezi hata işleme middleware'ine gönder
        next(error);
    }
});

/**
 * Bir isteğin durumunu ID'sine göre getirir.
 * @route GET /status/:id
 * @param {string} id - İstek ID'si (UUID).
 * @returns {object} İstek detayları.
 * @throws {InvalidInputError} Geçersiz istek ID formatı.
 * @throws {NotFoundError} İstek bulunamadı.
 * @throws {AppError} Dahili sunucu hataları.
 */
app.get('/status/:id', async (req, res, next) => { //
    const requestId = req.params.id; //

    // UUID formatı doğrulama
    if (!requestId || !isUuid(requestId, UUID_VERSION)) { //
        return next(new InvalidInputError('Invalid request ID format.'));
    }

    try {
        const requestData = await requestService.getRequestStatus(requestId); // İş mantığı RequestService'e delege edildi
        res.status(200).json(requestData.toObject()); // Değişmez nesneyi JSON'a dönüştürüp döndür
    } catch (error) {
        next(error); // Yakalanan hataları merkezi hata işleme middleware'ine gönder
    }
});

/**
 * Prometheus metrik endpoint'i.
 * @route GET /metrics
 * @returns {string} Prometheus metrikleri.
 */
app.get('/metrics', async (req, res, next) => { //
    try {
        updateDbPoolMetrics(); //
        res.setHeader('Content-Type', register.contentType); //
        res.end(await register.metrics()); //
    } catch (error) {
        next(error);
    }
});

// --- Merkezi Hata İşleme Middleware'i ---
// Tüm hataları yakalar ve tutarlı bir JSON yanıtı döndürür.
app.use((err, req, res, next) => {
    // Hata tipine göre durum kodu ve mesaj belirle
    if (err instanceof InvalidInputError) {
        console.warn(`Client Error (400) on ${req.method} ${req.path}: ${err.message}`, err.details);
        return res.status(err.statusCode).json({ error: err.message, details: err.details });
    } else if (err instanceof NotFoundError) {
        console.warn(`Client Error (404) on ${req.method} ${req.path}: ${err.message}`);
        return res.status(err.statusCode).json({ error: err.message });
    } else if (err instanceof AppError) {
        // Bilinen özel uygulama hataları
        console.error(`Application Error (${err.statusCode}) on ${req.method} ${req.path}: ${err.message}`, err.stack);
        return res.status(err.statusCode).json({ error: 'Internal Server Error', message: err.message });
    } else {
        // Beklenmedik/yakalanmayan hatalar
        console.error(`Unhandled Server Error (500) on ${req.method} ${req.path}:`, err);
        return res.status(500).json({ error: 'Internal Server Error', message: 'An unexpected error occurred.' });
    }
});


// --- Uygulamayı Başlatma ---
app.listen(APP_PORT, () => { //
    console.log(`Node.js service running on port ${APP_PORT}.`); //
    console.log(`Prometheus metrics: http://localhost:${APP_PORT}/metrics`); //
});

module.exports = app;