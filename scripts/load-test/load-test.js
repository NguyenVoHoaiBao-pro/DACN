/**
 * Kiểm thử tải Electro Store — 5 API
 *
 * Cài k6: https://k6.io/docs/get-started/installation/
 * Chạy:  k6 run scripts/load-test/load-test.js
 *
 * Biến môi trường (tùy chọn):
 *   BASE_URL=http://localhost:8080
 *   TEST_USERNAME=customer1
 *   TEST_PASSWORD=your_password
 *   RECO_USER_ID=9003
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";
const USERNAME = __ENV.TEST_USERNAME || "customer1";
const PASSWORD = __ENV.TEST_PASSWORD || "123456";
const RECO_USER_ID = __ENV.RECO_USER_ID || "9003";

const chatMessages = new SharedArray("chat_messages", function () {
  return [
    "Laptop gaming nào đang giảm giá?",
    "Điện thoại Samsung nào rẻ nhất?",
    "Chính sách đổi trả thế nào?",
    "Tai nghe bluetooth tốt dưới 2 triệu?",
    "Máy tính bảng học tập nên mua loại nào?",
  ];
});

export const options = {
  scenarios: {
    mixed_load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 20 },
        { duration: "2m", target: 50 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "15s",
    },
    chatbot_load: {
      executor: "constant-vus",
      vus: 5,
      duration: "2m",
      startTime: "30s",
      exec: "chatbotOnly",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    "http_req_duration{api:products}": ["p(95)<3000"],
    "http_req_duration{api:login}": ["p(95)<3000"],
    "http_req_duration{api:cart}": ["p(95)<3000"],
    "http_req_duration{api:recommend}": ["p(95)<2000"],
    "http_req_duration{api:chatbot}": ["p(95)<30000"],
  },
};

function login() {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ username: USERNAME, password: PASSWORD }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { api: "login" },
    },
  );
  check(res, { "login status 200": (r) => r.status === 200 });
  const body = res.json();
  return body?.data?.accessToken || null;
}

export default function () {
  const roll = Math.random();

  if (roll < 0.35) {
    const res = http.get(`${BASE_URL}/api/products?page=0&size=10`, {
      tags: { api: "products" },
    });
    check(res, { "products status 200": (r) => r.status === 200 });
  } else if (roll < 0.45) {
    login();
  } else if (roll < 0.60) {
    const token = login();
    if (token) {
      const res = http.get(`${BASE_URL}/api/cart`, {
        headers: { Authorization: `Bearer ${token}` },
        tags: { api: "cart" },
      });
      check(res, { "cart status 200": (r) => r.status === 200 });
    }
  } else if (roll < 0.80) {
    const res = http.get(`${BASE_URL}/recommend/${RECO_USER_ID}?top_k=10`, {
      tags: { api: "recommend" },
    });
    check(res, { "recommend status 200": (r) => r.status === 200 });
  } else {
    const msg = chatMessages[Math.floor(Math.random() * chatMessages.length)];
    const res = http.post(
      `${BASE_URL}/api/chatbot/chat`,
      JSON.stringify({ message: msg }),
      {
        headers: { "Content-Type": "application/json" },
        tags: { api: "chatbot" },
        timeout: "60s",
      },
    );
    check(res, { "chatbot status 200": (r) => r.status === 200 });
  }

  sleep(1);
}

export function chatbotOnly() {
  const msg = chatMessages[Math.floor(Math.random() * chatMessages.length)];
  const res = http.post(
    `${BASE_URL}/api/chatbot/chat`,
    JSON.stringify({ message: msg }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { api: "chatbot" },
      timeout: "60s",
    },
  );
  check(res, { "chatbot status 200": (r) => r.status === 200 });
  sleep(3);
}
