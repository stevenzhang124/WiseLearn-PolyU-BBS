FROM node:22-bookworm

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

RUN mkdir -p /app/uploads

EXPOSE 4000
CMD ["npm", "run", "start"]
