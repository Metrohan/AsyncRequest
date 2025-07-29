import http from 'k6/http';
import { sleep, check } from 'k6';

export let options = {
  vus: 100,
  duration: '5m',
};

export default function () {
  const payload = JSON.stringify({ data: "sample data" });
  const headers = { 'Content-Type': 'application/json' };

  const res1 = http.post('http://host.docker.internal:3001/submit', payload, { headers });

  check(res1, {
    'submit status is 202': (r) => r.status === 202,
  });

  const requestId = res1.json().requestId || res1.json().id;
  if (!requestId) {
    console.warn(`Missing requestId in response: ${res1.body}`);
    return;
  }

  // Durum kontrolü için 5 deneme yap (her biri 1 saniye arayla)
  let success = false;
  for (let i = 0; i < 5; i++) {
    const res2 = http.get(`http://host.docker.internal:3001/status/${requestId}`);
    const ok = check(res2, {
      'status check is 200': (r) => r.status === 200,
    });

    if (ok) {
      success = true;
      break;
    }

    sleep(1); // işlem tamamlanmamış olabilir, biraz bekle
  }

  if (!success) {
    console.warn(`Status never became 200 for ID ${requestId}`);
  }

  sleep(1);
}
