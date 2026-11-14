import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 20 },  // Ramp-up to 20 concurrent VUs
    { duration: '30s', target: 20 },  // Steady state
    { duration: '5s', target: 0 },    // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<150'], // 95% of requests must complete below 150ms
    http_req_failed: ['rate<0.01'],    // Error rate must be under 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://127.0.0.1:8000';

export default function () {
  const res = http.get(`${BASE_URL}/health/`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'healthy status in body': (r) => r.body.includes('"status":"ok"'),
  });
  sleep(0.1);
}
