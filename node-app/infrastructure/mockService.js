const {
    MOCK_SERVICE_MIN_DELAY_MS,
    MOCK_SERVICE_MAX_DELAY_MS,
    MOCK_SERVICE_SUCCESS_RATE,
    REQUEST_STATUS_SUCCESS,
    REQUEST_STATUS_FAILURE
} = require('../src/config/constants');
const { ExternalServiceError } = require('../src/utils/errors');

/**
 * Üçüncü parti servisi simüle eden fonksiyon.
 * @param {string} requestId - İstek ID'si.
 * @param {object} payload - İstek yükü.
 * @returns {Promise<object>} Servis yanıtı.
 * @throws {ExternalServiceError} Mock servis çağrısı başarısız olursa.
 */
async function callThirdPartyService(requestId, payload) {
    console.log(`[MOCK - ${requestId}] Mock third-party service call started...`);

    return new Promise((resolve, reject) => {

        const delay = Math.floor(Math.random() * (MOCK_SERVICE_MAX_DELAY_MS - MOCK_SERVICE_MIN_DELAY_MS + 1)) + MOCK_SERVICE_MIN_DELAY_MS;

        setTimeout(() => {
            const success = Math.random() < MOCK_SERVICE_SUCCESS_RATE;
            const response = {
                status: success ? REQUEST_STATUS_SUCCESS : REQUEST_STATUS_FAILURE,
                message: success ? 'Operation completed successfully.' : 'An unexpected error occurred.',
                processedAt: new Date().toISOString(),
                originalRequestId: requestId
            };
            console.log(`[MOCK - ${requestId}] Mock third-party service response (${delay}ms): ${response.status}`);

            if (success) {
                resolve(response);
            } else {
                reject(new ExternalServiceError(`Mock service failed for request ID: ${requestId}`, response));
            }
        }, delay);
    });
}

module.exports = {
    callThirdPartyService
};