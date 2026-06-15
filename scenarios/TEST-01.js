// TEST-01: Login endpoint stress test
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 5 },
    { duration: '10s', target: 8 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.20'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const payload = JSON.stringify({
    action: 'login',
    username: 'admin',
    password: 'admin2024',
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(`${BASE_URL}/api/access`, payload, params);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'has success field': (r) => {
      try { return JSON.parse(r.body).success === true; } catch (e) { return false; }
    },
  });
  sleep(1);
}
