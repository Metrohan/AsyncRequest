require('dotenv').config();

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('./db');
const { callThirdPartyService } = require('./mockService');
const {
    register,
    httpRequestCounter,
    httpRequestDurationSeconds,
    processedRequestsCounter,
    updateDbPoolMetrics
} = require('./metrics');

const app = express();
app.use(express.json());

app.use((req, res, next) => {
    const end = httpRequestDurationSeconds.startTimer();
    res.on('finish', () => {
        httpRequestCounter.inc({
            method: req.method,
            route: req.route ? req.route.path : req.path,
            code: res.statusCode
        });
        end({
            method: req.method,
            route: req.route ? req.route.path : req.path,
            code: res.statusCode
        });
    });
    next();
});


app.post('/submit', async (req, res) => {
    const requestId = uuidv4();
    const payload = req.body;

    if (!payload || Object.keys(payload).length === 0) {
        console.warn(`[${requestId}] Boş veya eksik yük: /submit`);
        return res.status(400).json({ error: 'İstek yükü boş olamaz.' });
    }

    try {
        await query(
            'INSERT INTO requests (id, payload, status) VALUES ($1, $2, $3)',
            [requestId, payload, 'pending']
        );
        console.log(`[${requestId}] İstek alındı ve 'pending' olarak kaydedildi.`);

        res.status(202).json({ requestId: requestId, message: 'İstek işlenmek üzere kabul edildi.' });

        (async () => {
            let thirdPartyResponseData = null;
            let newStatus = 'failed';

            try {
                
                thirdPartyResponseData = await callThirdPartyService(requestId, payload);
                newStatus = thirdPartyResponseData.status === 'SUCCESS' ? 'completed' : 'failed';
                console.log(`[${requestId}] Mock servis yanıtı alındı:`, thirdPartyResponseData.status);

            } catch (error) {
                console.error(`[${requestId}] Mock servis çağrılırken hata oluştu:`, error.message);
                thirdPartyResponseData = {
                    error: true,
                    message: `Mock servis hatası: ${error.message}`,
                    details: error.stack
                };
                newStatus = 'failed';
            } finally {
                try {
                    await query(
                        'UPDATE requests SET status = $1, third_party_response = $2, processed_at = NOW() WHERE id = $3',
                        [newStatus, thirdPartyResponseData, requestId]
                    );
                    console.log(`[${requestId}] İstek durumu '${newStatus}' olarak güncellendi.`);
                    processedRequestsCounter.inc({ status: newStatus });
                } catch (dbUpdateError) {
                    console.error(`[${requestId}] Veritabanı güncelleme hatası:`, dbUpdateError.message);
                }
            }
        })();

    } catch (error) {
        console.error(`[${requestId}] /submit endpointinde hata oluştu:`, error.message);
        res.status(500).json({ error: 'Dahili Sunucu Hatası', details: error.message });
        httpRequestCounter.inc({ method: req.method, route: req.route ? req.route.path : req.path, code: 500 });
    }
});

app.get('/status/:id', async (req, res) => {
    const requestId = req.params.id;

    if (!requestId || !uuidv4(requestId)) {
        return res.status(400).json({ error: 'Geçersiz istek ID formatı.' });
    }

    try {
        const result = await query(
            'SELECT id, status, received_at, processed_at, payload, third_party_response FROM requests WHERE id = $1',
            [requestId]
        );

        if (result.rows.length === 0) {
            console.log(`[${requestId}] İstek bulunamadı.`);
            return res.status(404).json({ error: 'İstek bulunamadı.' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(`[${requestId}] Durum alınırken hata oluştu:`, error.message);
        res.status(500).json({ error: 'Dahili Sunucu Hatası', details: error.message });
        httpRequestCounter.inc({ method: req.method, route: req.route ? req.route.path : req.path, code: 500 });
    }
});

app.get('/metrics', async (req, res) => {
    updateDbPoolMetrics();
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Node.js servis ${PORT} portunda çalışıyor.`);
    console.log(`Prometheus metrikleri: http://localhost:${PORT}/metrics`);
});

module.exports = app;