const promClient = require('prom-client');
const { getPool } = require('./db');

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpRequestCounter = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Toplam HTTP istek sayısı',
    labelNames: ['method', 'route', 'code']
});

const httpRequestDurationSeconds = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP isteklerinin saniye cinsinden süresi',
    labelNames: ['method', 'route', 'code'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

const processedRequestsCounter = new promClient.Counter({
    name: 'processed_requests_total',
    help: 'Asenkron olarak işlenen isteklerin toplam sayısı',
    labelNames: ['status']
});

const dbConnectionPoolUsage = new promClient.Gauge({
    name: 'db_connection_pool_usage',
    help: 'DB bağlantı havuzundaki aktif/boşta/bekleyen bağlantı sayısı',
    labelNames: ['state']
});

register.registerMetric(httpRequestCounter);
register.registerMetric(httpRequestDurationSeconds);
register.registerMetric(processedRequestsCounter);
register.registerMetric(dbConnectionPoolUsage);

const updateDbPoolMetrics = () => {
    const pool = getPool();
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

setInterval(updateDbPoolMetrics, 15000).unref();

module.exports = {
    register,
    httpRequestCounter,
    httpRequestDurationSeconds,
    processedRequestsCounter,
    updateDbPoolMetrics
};