const logger = require('../src/utils/logger');
const { v4: uuidv4 } = require('uuid'); // uuidv4'ü eklemeyi unutmayın
const validatePayload = require('../validators/submitValidator'); // Doğrulama fonksiyonunu içe aktarın

// `createRequest` fonksiyonunun da içe aktarılması gerekiyor
const { createRequest } = require('../services/requestService');

async function handleSubmit(req, res) {
  const body = req.body;

  if (!body || Object.keys(body).length === 0) {
    logger.warn({ requestId: req.id }, 'Empty or missing payload in /submit');
    return res.status(400).json({ error: 'Empty payload' });
  }

  // VALIDASYON ADIMI BURADA OLMALI
  const { valid, errors } = validatePayload(body);
  if (!valid) {
    logger.warn({ requestId: req.id, errors }, 'Invalid payload structure');
    return res.status(400).json({ error: 'Invalid payload structure.', details: errors });
  }

  try {
    const requestId = uuidv4();
    logger.info({ requestId }, 'Generated request ID');

    // `createRequest` fonksiyonunuz artık sadece `body` değil,
    // aynı zamanda `requestId`'yi de almalı
    const request = await createRequest({ ...body, requestId });

    logger.info({ requestId }, 'Request stored successfully');

    res.status(202).json({ requestId });
  } catch (error) {
    logger.error({ requestId: req.id, error }, 'Failed to process /submit request');
    res.status(500).json({ error: 'Internal Server Error' });
  }
}