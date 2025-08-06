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

const requestProcessingFailures = new promClient.Counter({
    name: 'request_processing_failures_total',
    help: 'Total number of asynchronous processing failures',
    labelNames: ['stage', 'error']
});

const cpuUsageGauge = new promClient.Gauge({
    name: 'process_cpu_usage_percent',
    help: 'CPU usage of the Node.js process in percent (approx)'
});

const memoryUsageGauge = new promClient.Gauge({
    name: 'process_memory_usage_bytes',
    help: 'Memory usage of the Node.js process in bytes'
});


register.registerMetric(httpRequestCounter);
register.registerMetric(httpRequestDurationSeconds);
register.registerMetric(processedRequestsCounter);
register.registerMetric(dbConnectionPoolUsage);
register.registerMetric(requestProcessingFailures);
register.registerMetric(cpuUsageGauge);
register.registerMetric(memoryUsageGauge);

/**
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

const updateProcessMetrics = () => {
    const memoryUsage = process.memoryUsage().rss;
    const cpuUsage = process.cpuUsage();

    const userCPUms = cpuUsage.user / 1000;
    const systemCPUms = cpuUsage.system / 1000;
    const cpuPercent = (userCPUms + systemCPUms) / 1000;

    cpuUsageGauge.set(cpuPercent);
    memoryUsageGauge.set(memoryUsage);
};

setInterval(updateDbPoolMetrics, DB_METRICS_UPDATE_INTERVAL_MS).unref();
setInterval(updateProcessMetrics, DB_METRICS_UPDATE_INTERVAL_MS).unref();

module.exports = {
    register,
    httpRequestCounter,
    httpRequestDurationSeconds,
    processedRequestsCounter,
    updateDbPoolMetrics,
    requestProcessingFailures
};