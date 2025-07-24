async function callThirdPartyService(requestId, payload) {
    console.log(`[MOCK - ${requestId}] Mock 3. parti servis çağrısı başladı...`);

    return new Promise(resolve => {
        const minDelay = parseInt(process.env.MOCK_MIN_DELAY_MS || '50', 10);
        const maxDelay = parseInt(process.env.MOCK_MAX_DELAY_MS || '500', 10);
        const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

        setTimeout(() => {
            const success = Math.random() > 0.1; // failed mesajını gösterebilmek için %10luk bir failed oranı koyduk
            const response = {
                status: success ? 'SUCCESS' : 'FAILURE',
                message: success ? 'İşlem başarıyla tamamlandı.' : 'Beklenmedik bir hata oluştu.',
                processedAt: new Date().toISOString(),
                originalRequestId: requestId
            };
            console.log(`[MOCK - ${requestId}] Mock 3. parti servis yanıtı (${delay}ms):`, response.status);
            resolve(response);
        }, delay);
    });
}

module.exports = {
    callThirdPartyService
};