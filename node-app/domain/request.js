class Request {
    #id;
    #payload;
    #status;
    #receivedAt;
    #processedAt;
    #thirdPartyResponse;

    /**
     * @param {object} params
     * @param {string} params.id
     * @param {object} params.payload
     * @param {string} params.status
     * @param {Date} [params.receivedAt=new Date()]
     * @param {Date|null} [params.processedAt=null]
     * @param {object|null} [params.thirdPartyResponse=null]
     */
    constructor({ id, payload, status, receivedAt = new Date(), processedAt = null, thirdPartyResponse = null }) {
        if (!id || !payload || !status) {
            throw new Error('Request ID, payload, and status are required.');
        }

        this.#id = id;
        this.#payload = Object.freeze(JSON.parse(JSON.stringify(payload)));
        this.#status = status;
        this.#receivedAt = receivedAt;
        this.#processedAt = processedAt;
        this.#thirdPartyResponse = thirdPartyResponse ? Object.freeze(JSON.parse(JSON.stringify(thirdPartyResponse))) : null;

        Object.freeze(this);
    }

    getId() { return this.#id; }
    getPayload() { return this.#payload; }
    getStatus() { return this.#status; }
    getReceivedAt() { return this.#receivedAt; }
    getProcessedAt() { return this.#processedAt; }
    getThirdPartyResponse() { return this.#thirdPartyResponse; }

    /**
     * @param {string} newStatus
     * @param {object|null} [newThirdPartyResponse=null]
     * @returns {Request}
     */
    withStatus(newStatus, newThirdPartyResponse = null) {
        return new Request({
            id: this.#id,
            payload: this.#payload,
            status: newStatus,
            receivedAt: this.#receivedAt,
            processedAt: new Date(),
            thirdPartyResponse: newThirdPartyResponse
        });
    }

    /**
     * @returns {object}
     */
    toObject() {
        return {
            id: this.#id,
            payload: this.#payload,
            status: this.#status,
            receivedAt: this.#receivedAt,
            processedAt: this.#processedAt,
            thirdPartyResponse: this.#thirdPartyResponse
        };
    }
}

module.exports = Request;