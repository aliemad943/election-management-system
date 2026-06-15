// TEST-02: Access GET endpoint
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 5 },
    { duration: '10s', target: 10 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.10'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const res = http.get(`${BASE_URL}/api/access`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'has enabled field': (r) => {
      try { return JSON.parse(r.body).enabled === true; } catch (e) { return false; }
    },
  });
  sleep(0.5);
}
