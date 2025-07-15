// node-app/src/db.js
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'myuser',
    host: process.env.DB_HOST || 'localhost', // DİKKAT: Docker içinde 'db' olacak
    database: process.env.DB_NAME || 'my_service_db',
    password: process.env.DB_PASSWORD || 'mypassword',
    port: process.env.DB_PORT || 5432,
    max: 10,
    idleTimeoutMillis: 30000
});

pool.on('error', (err) => {
    console.error('Veritabanı bağlantı havuzunda beklenmedik hata:', err);
});

module.exports = {
    query: (text, params) => {
        const start = Date.now();
        return pool.query(text, params)
            .then(res => {
                const duration = Date.now() - start;
                console.log('Veritabanı sorgusu çalıştı:', { text, duration, rows: res.rowCount });
                return res;
            })
            .catch(err => {
                console.error('Veritabanı sorgu hatası:', { text, error: err.message });
                throw err;
            });
    },
    getPool: () => pool
};