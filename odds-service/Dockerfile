FROM node:20-slim

WORKDIR /app

COPY odds-service/package*.json ./
RUN npm install --omit=dev
RUN npx playwright install --with-deps chromium

COPY odds-service ./

CMD ["npm", "start"]
