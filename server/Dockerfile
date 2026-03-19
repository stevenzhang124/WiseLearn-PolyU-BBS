FROM node:22-bullseye

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 4000
CMD ["npm", "run", "start"]
