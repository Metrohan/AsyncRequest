require('dotenv').config();

const express = require('express');
const { v4: uuidv4, validate: isUuid } = require('uuid');
const { APP_PORT, HTTP_REQUEST_BODY_LIMIT, UUID_VERSION } = require('./config/constants');
const { InvalidInputError, NotFoundError, AppError } = require('./utils/errors');
const {
    register,
    httpRequestCounter,
    httpRequestDurationSeconds,
    updateDbPoolMetrics,
    requestProcessingFailures
} = require('../infrastructure/metrics');
const RequestService = require('../services/requestService');
const logger = require('./utils/logger');
const validatePayload = require('../validators/submitValidator');

const app = express();
app.use(express.json({ limit: HTTP_REQUEST_BODY_LIMIT }));

const requestService = new RequestService();

app.use((req, res, next) => {
    const end = httpRequestDurationSeconds.startTimer();
    res.on('finish', () => {
        const routePath = req.route ? req.route.path : req.path;
        httpRequestCounter.inc({
            method: req.method,
            route: routePath,
            code: res.statusCode
        });
        end({
            method: req.method,
            route: routePath,
            code: res.statusCode
        });
    });
    next();
});

/**
 * Yeni bir istek gönderir ve işlenmek üzere kabul eder.
 * @route POST /submit
 * @body {object} payload - İşlenecek veri.
 * @returns {object} requestId ve kabul mesajı.
 * @throws {InvalidInputError} Boş veya geçersiz yük.
 * @throws {AppError} Dahili sunucu hataları.
 */
app.post('/submit', async (req, res, next) => {
    const requestId = uuidv4();
    const payload = req.body;

    if (!payload || Object.keys(payload).length === 0) {
        logger.warn(`[${requestId}] Empty or missing payload: /submit`);
        return next(new InvalidInputError('Request payload cannot be empty.'));
    }

    const { valid, errors } = validatePayload(payload);
    if (!valid) {
        return next(new InvalidInputError('Invalid payload structure.', errors));
    }

    try {
        const initialRequest = await requestService.createRequest(requestId, payload);

        res.status(202).json({
            requestId: initialRequest.getId(),
            message: 'Request accepted for processing.'
        });

        requestService.processRequestAsync(initialRequest)
            .catch(error => {
                logger.error(`[${requestId}] Async processing failed: ${error.message}`);
                requestProcessingFailures.inc({ stage: 'processRequest', error: error.name });
            });

    } catch (error) {
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
app.get('/status/:id', async (req, res, next) => {
    const requestId = req.params.id;

    if (!requestId || !isUuid(requestId, UUID_VERSION)) {
        return next(new InvalidInputError('Invalid request ID format.'));
    }

    try {
        const requestData = await requestService.getRequestStatus(requestId);
        res.status(200).json(requestData.toObject());
    } catch (error) {
        next(error);
    }
});

/**
 * Prometheus metrik endpoint'i.
 * @route GET /metrics
 * @returns {string} Prometheus metrikleri.
 */
app.get('/metrics', async (req, res, next) => {
    try {
        updateDbPoolMetrics();
        res.setHeader('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (error) {
        next(error);
    }
});

app.use((err, req, res, next) => {
    if (err instanceof InvalidInputError) {
        logger.warn(`Client Error (400) on ${req.method} ${req.path}: ${err.message}`, err.details);
        return res.status(err.statusCode).json({ error: err.message, details: err.details });
    } else if (err instanceof NotFoundError) {
        logger.warn(`Client Error (404) on ${req.method} ${req.path}: ${err.message}`);
        return res.status(err.statusCode).json({ error: err.message });
    } else if (err instanceof AppError) {
        logger.error(`Application Error (${err.statusCode}) on ${req.method} ${req.path}: ${err.message}`, err.stack);
        return res.status(err.statusCode).json({ error: 'Internal Server Error', message: err.message });
    } else {
        logger.error(`Unhandled Server Error (500) on ${req.method} ${req.path}:`, err);
        return res.status(500).json({ error: 'Internal Server Error', message: 'An unexpected error occurred.' });
    }
});

app.listen(APP_PORT, () => {
    logger.info(`Node.js service running on port ${APP_PORT}.`);
    logger.info(`Prometheus metrics: http://localhost:${APP_PORT}/metrics`);
});

module.exports = app;