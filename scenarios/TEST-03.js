// TEST-03: Indicators endpoint (authenticated)
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 3 },
    { duration: '10s', target: 8 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.20'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export function setup() {
  const payload = JSON.stringify({
    action: 'login',
    username: 'admin',
    password: 'admin2024',
  });
  const params = { headers: { 'Content-Type': 'application/json' } };
  const res = http.post(`${BASE_URL}/api/access`, payload, params);
  const cookies = res.cookies;
  return { authCookie: cookies.election_auth ? cookies.election_auth[0].value : '' };
}

export default function (data) {
  const params = {
    headers: { Cookie: `election_auth=${data.authCookie}` },
  };
  const res = http.get(`${BASE_URL}/api/indicators`, params);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'has success field': (r) => {
      try { return JSON.parse(r.body).success === true; } catch (e) { return false; }
    },
  });
  sleep(1);
}
