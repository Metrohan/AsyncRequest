// load-tests/submit-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

// Özel metrik: Başarılı submit istekleri
const successfulSubmits = new Counter('successful_submits');

export const options = {
  // Test senaryosu seçenekleri
  stages: [
    { duration: '30s', target: 50 },  // 30 saniyede 50 sanal kullanıcıya yüksel
    { duration: '1m', target: 100 },  // 1 dakika boyunca 100 sanal kullanıcıda kal
    { duration: '30s', target: 0 },   // 30 saniyede 0 sanal kullanıcıya düş
  ],
  thresholds: {
    // Başarılı HTTP isteklerinin %90'ı 200 olmalı
    'http_req_failed': ['rate<0.1'], // Hata oranı %10'dan az olmalı
    'http_req_duration': ['p(95)<2000'], // İsteklerin %95'i 2 saniyeden kısa sürmeli
    'successful_submits': ['count>100'], // En az 100 başarılı submit olmalı (örnek eşik)
  },
};

export default function () {
  const url = 'http://localhost:3001/submit'; // Node.js uygulamanızın submit endpoint'i
  const payload = JSON.stringify({
    client: `k6-client-${__VU}-${__ITER}`, // Sanal kullanıcı ve iterasyon ID'si
    product: `item-${Math.floor(Math.random() * 100)}`, // Rastgele ürün
  });
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'is status 202': (r) => r.status === 202, // 202 Accepted bekliyoruz
    'has requestId': (r) => r.json() && r.json().requestId !== undefined,
  });

  if (res.status === 202) {
    successfulSubmits.add(1); // Başarılıysa özel metriği artır
  }

  sleep(0.5); // Her istek arasında 0.5 saniye bekle
}