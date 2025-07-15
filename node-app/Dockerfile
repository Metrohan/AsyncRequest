# node-app/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production # Sadece üretim bağımlılıklarını kur
COPY . .
EXPOSE 3001
CMD ["npm", "start"]