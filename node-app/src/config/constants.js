const MOCK_SERVICE_MIN_DELAY_MS = parseInt(process.env.MOCK_MIN_DELAY_MS || '50', 10); //
const MOCK_SERVICE_MAX_DELAY_MS = parseInt(process.env.MOCK_MAX_DELAY_MS || '500', 10); //
const MOCK_SERVICE_SUCCESS_RATE = 0.9; // %90 başarı oranı

const DB_USER = process.env.DB_USER || 'myuser'; //
const DB_HOST = process.env.DB_HOST || 'localhost'; //
const DB_NAME = process.env.DB_NAME || 'my_service_db'; //
const DB_PASSWORD = process.env.DB_PASSWORD || 'mypassword'; //
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10); //
const DB_POOL_MAX_CONNECTIONS = 10; //
const DB_POOL_IDLE_TIMEOUT_MILLIS = 30000; //
const DB_METRICS_UPDATE_INTERVAL_MS = 15000; //

const APP_PORT = parseInt(process.env.PORT || '3001', 10); //
const HTTP_REQUEST_BODY_LIMIT = '100kb'; 
const UUID_VERSION = 4; 

const REQUEST_STATUS_PENDING = 'pending'; //
const REQUEST_STATUS_COMPLETED = 'completed'; //
const REQUEST_STATUS_FAILED = 'failed'; //
const REQUEST_STATUS_SUCCESS = 'SUCCESS'; //
const REQUEST_STATUS_FAILURE = 'FAILURE'; //

module.exports = {
    MOCK_SERVICE_MIN_DELAY_MS,
    MOCK_SERVICE_MAX_DELAY_MS,
    MOCK_SERVICE_SUCCESS_RATE,
    DB_USER,
    DB_HOST,
    DB_NAME,
    DB_PASSWORD,
    DB_PORT,
    DB_POOL_MAX_CONNECTIONS,
    DB_POOL_IDLE_TIMEOUT_MILLIS,
    DB_METRICS_UPDATE_INTERVAL_MS,
    APP_PORT,
    HTTP_REQUEST_BODY_LIMIT,
    UUID_VERSION,
    REQUEST_STATUS_PENDING,
    REQUEST_STATUS_COMPLETED,
    REQUEST_STATUS_FAILED,
    REQUEST_STATUS_SUCCESS,
    REQUEST_STATUS_FAILURE
};