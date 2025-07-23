// node-app/src/infrastructure/db.js

const { Pool } = require('pg'); //
const {
    DB_USER, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT,
    DB_POOL_MAX_CONNECTIONS, DB_POOL_IDLE_TIMEOUT_MILLIS
} = require('../config/constants'); // Sabitler merkezi yerden alınıyor
const { DatabaseError } = require('../utils/errors'); // Özel hata sınıfı

// Veritabanı bağlantı havuzu oluşturuluyor
const pool = new Pool({
    user: DB_USER, //
    host: DB_HOST, //
    database: DB_NAME, //
    password: DB_PASSWORD, //
    port: DB_PORT, //
    max: DB_POOL_MAX_CONNECTIONS, //
    idleTimeoutMillis: DB_POOL_IDLE_TIMEOUT_MILLIS //
});

// Havuz hata olaylarını dinle
pool.on('error', (err) => {
    // Veritabanı havuzunda kritik hataları logla
    console.error('Database connection pool encountered an unexpected error:', err);
    // Genellikle bu tür hatalarda uygulamayı kapatmak gerekebilir veya daha gelişmiş bir yeniden bağlanma stratejisi izlenir.
    // process.exit(1);
});

/**
 * Veritabanına sorgu gönderir.
 * @param {string} sqlText - SQL sorgu metni.
 * @param {Array<any>} [params=[]] - Sorguya geçirilecek parametreler.
 * @returns {Promise<import('pg').QueryResult>} Sorgu sonucu.
 * @throws {DatabaseError} Veritabanı sorgusu sırasında hata oluşursa.
 */
async function executeQuery(sqlText, params = []) {
    const startTime = Date.now();
    try {
        const result = await pool.query(sqlText, params); //
        const duration = Date.now() - startTime;
        console.log(`Database query executed: ${sqlText} - Duration: ${duration}ms, Rows: ${result.rowCount}`); //
        return result;
    } catch (error) {
        // Orijinal hatayı kapsülleyerek daha anlamlı bir hata fırlat
        console.error(`Database query error for: ${sqlText} - Error: ${error.message}`); //
        throw new DatabaseError('Failed to execute database query.', error);
    }
}

/**
 * Veritabanı bağlantı havuzunu döndürür.
 * Metrikler için kullanılır.
 * @returns {import('pg').Pool}
 */
function getDatabasePool() {
    return pool;
}

module.exports = {
    executeQuery,
    getDatabasePool
};