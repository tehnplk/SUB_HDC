FROM node:20-alpine

WORKDIR /transform

COPY package*.json ./
RUN npm ci --omit=dev

COPY run_transform.js run_order.js ./

# sql/ mount สดจาก host ตอนรัน (ดู docker-compose.yml) ไม่ได้ฝังใน image
CMD ["node", "run_transform.js"]
