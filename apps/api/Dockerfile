FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY apps/api ./apps/api
COPY tsconfig.json ./tsconfig.json
EXPOSE 8080
CMD ["npx", "tsx", "apps/api/src/server.ts"]
