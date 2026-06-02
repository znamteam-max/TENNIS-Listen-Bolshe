FROM node:20-slim

WORKDIR /app

COPY server/package*.json ./
RUN npm install --omit=dev

COPY server ./

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["npm", "start"]
