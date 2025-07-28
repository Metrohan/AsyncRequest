const promClient = require('prom-client');
const { getDatabasePool } = require('./db');
const { DB_METRICS_UPDATE_INTERVAL_MS } = require('../src/config/constants');

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpRequestCounter = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'code']
});

const httpRequestDurationSeconds = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'code'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

const processedRequestsCounter = new promClient.Counter({
    name: 'processed_requests_total',
    help: 'Total number of asynchronously processed requests',
    labelNames: ['status']
});

const dbConnectionPoolUsage = new promClient.Gauge({
    name: 'db_connection_pool_usage',
    help: 'Number of active/idle/waiting connections in the DB pool',
    labelNames: ['state']
});

register.registerMetric(httpRequestCounter);
register.registerMetric(httpRequestDurationSeconds);
register.registerMetric(processedRequestsCounter);
register.registerMetric(dbConnectionPoolUsage);

/**
 * Veritabanı bağlantı havuzu metriklerini günceller.
 * @function updateDbPoolMetrics
 */
const updateDbPoolMetrics = () => {
    const pool = getDatabasePool();
    if (pool) {
        const totalClients = pool.totalCount;
        const idleClients = pool.idleCount;
        const waitingClients = pool.waitingCount;

        dbConnectionPoolUsage.set({ state: 'active' }, totalClients - idleClients - waitingClients);
        dbConnectionPoolUsage.set({ state: 'idle' }, idleClients);
        dbConnectionPoolUsage.set({ state: 'total' }, totalClients);
        dbConnectionPoolUsage.set({ state: 'waiting' }, waitingClients);
    }
};

setInterval(updateDbPoolMetrics, DB_METRICS_UPDATE_INTERVAL_MS).unref();

module.exports = {
    register,
    httpRequestCounter,
    httpRequestDurationSeconds,
    processedRequestsCounter,
    updateDbPoolMetrics
};