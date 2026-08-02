FROM node:22-alpine
ARG APP_VERSION=development
ENV APP_VERSION=$APP_VERSION
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY apps/api ./apps/api
COPY tsconfig.json ./tsconfig.json
EXPOSE 8080
CMD ["npx", "tsx", "apps/api/src/server.ts"]
