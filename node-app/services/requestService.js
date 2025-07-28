const { executeQuery } = require('../infrastructure/db');
const { callThirdPartyService } = require('../infrastructure/mockService');
const Request = require('../domain/request');
const {
    REQUEST_STATUS_PENDING,
    REQUEST_STATUS_COMPLETED,
    REQUEST_STATUS_FAILED,
    REQUEST_STATUS_SUCCESS,
    REQUEST_STATUS_FAILURE
} = require('../src/config/constants');
const { DatabaseError, ExternalServiceError, NotFoundError } = require('../src/utils/errors');
const { processedRequestsCounter } = require('../infrastructure/metrics');


class RequestService {
    /**
     * Yeni bir istek oluşturur ve veritabanına kaydeder.
     * @param {string} requestId - Yeni oluşturulan istek ID'si.
     * @param {object} payload - İstek yükü.
     * @returns {Promise<Request>} Kaydedilen değişmez Request nesnesi.
     * @throws {DatabaseError} Veritabanı işlemi sırasında hata oluşursa.
     */
    async createRequest(requestId, payload) {
        const newRequest = new Request({
            id: requestId,
            payload: payload,
            status: REQUEST_STATUS_PENDING
        });

        try {
            await executeQuery(
                'INSERT INTO requests (id, payload, status, received_at) VALUES ($1, $2, $3, $4)',
                [newRequest.getId(), newRequest.getPayload(), newRequest.getStatus(), newRequest.getReceivedAt()]
            );
            console.log(`[${requestId}] Request received and saved as '${REQUEST_STATUS_PENDING}'.`); //
            return newRequest;
        } catch (error) {
            throw new DatabaseError(`Failed to save initial request ${requestId} to database.`, error);
        }
    }

    /**
     * 3. parti servisi çağırır ve isteğin durumunu günceller.
     * Bu fonksiyon, API yanıtı hemen döndükten sonra asenkron olarak çalışır.
     * @param {Request} initialRequest - Başlangıçtaki değişmez Request nesnesi.
     */
    async processRequestAsync(initialRequest) {
        let updatedRequest = initialRequest;
        let thirdPartyResponseData = null;
        let newStatus = REQUEST_STATUS_FAILED;

        try {
            thirdPartyResponseData = await callThirdPartyService(initialRequest.getId(), initialRequest.getPayload()); //
            newStatus = thirdPartyResponseData.status === REQUEST_STATUS_SUCCESS ? REQUEST_STATUS_COMPLETED : REQUEST_STATUS_FAILED; //
            console.log(`[${initialRequest.getId()}] Mock service response received: ${thirdPartyResponseData.status}`); //

        } catch (error) {
            console.error(`[${initialRequest.getId()}] Error calling mock service:`, error.message); //
            if (error instanceof ExternalServiceError) {
                thirdPartyResponseData = error.details || { error: true, message: error.message };
            } else {
                thirdPartyResponseData = {
                    error: true,
                    message: `Unexpected error during mock service call: ${error.message}`,
                    details: error.stack
                };
            }
            newStatus = REQUEST_STATUS_FAILED;
        } finally {
            try {
                updatedRequest = initialRequest.withStatus(newStatus, thirdPartyResponseData);

                await executeQuery(
                    'UPDATE requests SET status = $1, third_party_response = $2, processed_at = $3 WHERE id = $4',
                    [updatedRequest.getStatus(), updatedRequest.getThirdPartyResponse(), updatedRequest.getProcessedAt(), updatedRequest.getId()]
                );
                console.log(`[${updatedRequest.getId()}] Request status updated to '${newStatus}'.`); //
                processedRequestsCounter.inc({ status: newStatus }); //
            } catch (dbUpdateError) {
                console.error(`[${updatedRequest.getId()}] Database update error after processing:`, dbUpdateError.message); //
            }
        }
    }

    /**
     * Bir isteği ID'sine göre getirir.
     * @param {string} requestId - İstek ID'si.
     * @returns {Promise<Request>} Bulunan değişmez Request nesnesi.
     * @throws {NotFoundError} İstek bulunamazsa.
     * @throws {DatabaseError} Veritabanı işlemi sırasında hata oluşursa.
     */
    async getRequestStatus(requestId) {
        try {
            const result = await executeQuery(
                'SELECT id, status, received_at, processed_at, payload, third_party_response FROM requests WHERE id = $1',
                [requestId]
            );

            if (result.rows.length === 0) {
                console.log(`[${requestId}] Request not found.`);
                throw new NotFoundError('Request not found.');
            }

            const row = result.rows[0];
            return new Request({
                id: row.id,
                payload: row.payload,
                status: row.status,
                receivedAt: row.received_at,
                processedAt: row.processed_at,
                thirdPartyResponse: row.third_party_response
            });
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new DatabaseError(`Failed to retrieve status for request ${requestId}.`, error);
        }
    }
}

module.exports = RequestService;