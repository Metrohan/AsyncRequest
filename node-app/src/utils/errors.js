/**
 * @class AppError
 * @extends Error
 */
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
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
 * @class NotFoundError
 * @extends AppError
 */
class NotFoundError extends AppError {
    constructor(message = 'Kaynak bulunamadı.') {
        super(message, 404);
    }
}

/**
 * @class ExternalServiceError
 * @extends AppError
 */
class ExternalServiceError extends AppError {
    constructor(message = 'Harici servis çağrısı sırasında hata oluştu.', details = null) {
        super(message, 503);
        this.details = details;
    }
}

/**
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