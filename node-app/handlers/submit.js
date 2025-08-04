const logger = require('../logger');

async function handleSubmit(req, res) {
  const body = req.body;

  if (!body || Object.keys(body).length === 0) {
    logger.warn({ requestId: req.id }, 'Empty or missing payload in /submit');
    return res.status(400).json({ error: 'Empty payload' });
  }

  try {
    const requestId = uuidv4();
    logger.info({ requestId }, 'Generated request ID');

    const request = await createRequest({ ...body, requestId });

    logger.info({ requestId }, 'Request stored successfully');

    res.status(202).json({ requestId });
  } catch (error) {
    logger.error({ requestId: req.id, error }, 'Failed to process /submit request');
    res.status(500).json({ error: 'Internal Server Error' });
  }
}