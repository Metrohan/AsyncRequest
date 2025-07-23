// node-app/src/utils/errors.js

/**
 * Temel uygulama hatası sınıfı.
 * @class AppError
 * @extends Error
 */
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        // Hata yakalama stack trace'ini daha okunur hale getirir
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Geçersiz giriş hatası sınıfı.
 * @class InvalidInputError
 * @extends AppError
 */
class InvalidInputError extends AppError {
    constructor(message = 'Geçersiz giriş.', details = null) {
        super(message, 400);
        this.details = details;
    }
}

/**
 * Kaynak bulunamadı hatası sınıfı.
 * @class NotFoundError
 * @extends AppError
 */
class NotFoundError extends AppError {
    constructor(message = 'Kaynak bulunamadı.') {
        super(message, 404);
    }
}

/**
 * Harici servis çağrısı hatası sınıfı.
 * @class ExternalServiceError
 * @extends AppError
 */
class ExternalServiceError extends AppError {
    constructor(message = 'Harici servis çağrısı sırasında hata oluştu.', details = null) {
        super(message, 503); // Service Unavailable
        this.details = details;
    }
}

/**
 * Veritabanı hatası sınıfı.
 * @class DatabaseError
 * @extends AppError
 */
class DatabaseError extends AppError {
    constructor(message = 'Veritabanı işlemi sırasında hata oluştu.', originalError = null) {
        super(message, 500);
        this.originalError = originalError;
    }
}

module.exports = {
    AppError,
    InvalidInputError,
    NotFoundError,
    ExternalServiceError,
    DatabaseError
};