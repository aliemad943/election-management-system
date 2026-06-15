// TEST-05: Voter checkin endpoint (authenticated)
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 3 },
    { duration: '10s', target: 5 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.30'],
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
  const payload = JSON.stringify({ voterId: `nonexistent-${__VU}-${__ITER}` });
  const params = {
    headers: {
      'Content-Type': 'application/json',
      Cookie: `election_auth=${data.authCookie}`,
    },
  };
  const res = http.post(`${BASE_URL}/api/voters/checkin`, payload, params);
  check(res, {
    'status is 404 or 500': (r) => r.status === 404 || r.status === 500,
  });
  sleep(1);
}
