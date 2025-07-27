// load-tests/status-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const successfulStatusChecks = new Counter('successful_status_checks');
const completedRequests = new Counter('completed_requests');
const failedRequests = new Counter('failed_requests');

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // 30 saniyede 20 sanal kullanıcıya yüksel
    { duration: '1m', target: 50 },   // 1 dakika boyunca 50 sanal kullanıcıda kal
    { duration: '30s', target: 0 },    // 30 saniyede 0 sanal kullanıcıya düş
  ],
  thresholds: {
    'http_req_failed': ['rate<0.1'],
    'http_req_duration': ['p(95)<3000'], // /status için biraz daha esnek süre
    'successful_status_checks': ['count>50'],
  },
  // submit ve status istekleri arasında veri paylaşımı için
  // Shared iterations kullanıyorsanız, buradaki logic'i dikkatli yönetin.
  // Bu örnek, her VU'nun kendi submit/status döngüsünü yapmasını sağlar.
};

export default function () {
  // 1. Adım: /submit endpoint'ine POST isteği gönder
  const submitUrl = 'http://localhost:3001/submit';
  const submitPayload = JSON.stringify({
    client: `k6-status-tester-${__VU}-${__ITER}`,
    product: `item-s-${Math.floor(Math.random() * 50)}`,
  });
  const submitParams = { headers: { 'Content-Type': 'application/json' } };

  const submitRes = http.post(submitUrl, submitPayload, submitParams);

  check(submitRes, {
    'submit status 202': (r) => r.status === 202,
    'submit has requestId': (r) => r.json() && r.json().requestId !== undefined,
  });

  if (submitRes.status !== 202 || !submitRes.json() || !submitRes.json().requestId) {
    console.error(`Failed to submit request: ${submitRes.status} ${submitRes.body}`);
    sleep(1); // Hatalı submit durumunda bekle ve devam et
    return;
  }

  const requestId = submitRes.json().requestId;

  // 2. Adım: Durum kontrolü için döngü
  let status = 'pending';
  let attempts = 0;
  const maxAttempts = 10; // Maksimum deneme sayısı
  const statusCheckInterval = 2; // Durum kontrolü arasındaki bekleme (saniye)

  while (status === 'pending' && attempts < maxAttempts) {
    const statusUrl = `http://localhost:3001/status/${requestId}`;
    const statusRes = http.get(statusUrl);

    check(statusRes, {
      'status check is 200': (r) => r.status === 200,
      'status check has id': (r) => r.json() && r.json().id === requestId,
    });

    if (statusRes.status === 200 && statusRes.json()) {
      status = statusRes.json().status;
      console.log(`Request ${requestId} status: ${status} (Attempt: ${attempts + 1})`);

      if (status !== 'pending') {
        successfulStatusChecks.add(1);
        if (status === 'completed') {
          completedRequests.add(1);
        } else if (status === 'failed') {
          failedRequests.add(1);
        }
      }
    } else {
      console.error(`Failed to get status for ${requestId}: ${statusRes.status} ${statusRes.body}`);
    }

    attempts++;
    if (status === 'pending' && attempts < maxAttempts) {
      sleep(statusCheckInterval);
    }
  }

  if (status === 'pending') {
    console.warn(`Request ${requestId} did not complete within ${maxAttempts} attempts.`);
  }

  sleep(1); // Ana döngüdeki her iterasyon arasında bekle
}