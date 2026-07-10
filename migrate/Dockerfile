FROM node:20-alpine

WORKDIR /migrate

COPY package*.json ./
RUN npm ci --omit=dev

COPY run_migrations.js ./

# one-shot: รัน migration จบแล้ว exit — compose ใช้ service_completed_successfully
# รอผลก่อน start webapp/importer/cache/transform. table_update/ กับ table/lookup/
# mount จาก host ตอนรัน (ดู docker-compose.yml) ไม่ได้ฝังใน image
CMD ["node", "run_migrations.js"]
