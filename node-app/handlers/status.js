async function handleStatus(req, res) {
  const { id } = req.params;

  try {
    const request = await getRequest(id);

    if (!request) {
      logger.warn({ id }, 'Status check failed: request not found');
      return res.status(404).json({ error: 'Not found' });
    }

    logger.info({ id, status: request.status }, 'Returning status info');
    res.json(request);
  } catch (error) {
    logger.error({ id, error }, 'Error while checking status');
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
