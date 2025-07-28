import http from 'k6/http';
import { sleep, check } from 'k6';

export let options = {
  vus: 100,          // eş zamanlı sanal kullanıcı (concurrent users)
  duration: '5m',    // toplam test süresi
};

export default function () {
  const payload = JSON.stringify({ data: "sample data" });
  const headers = { headers: { 'Content-Type': 'application/json' } };

  const res1 = http.post('http://node-app:3001/submit', payload, headers);
  check(res1, {
    'submit status is 200': (r) => r.status === 200,
  });

  const id = res1.json().id;


  const res2 = http.get(`http://node-app:3001/status/${id}`);
  check(res2, {
    'status check is 200': (r) => r.status === 200,
  });

  sleep(0.5);
}
