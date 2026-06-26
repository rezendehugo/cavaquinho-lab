FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM deps AS build
COPY . .
RUN npm test
RUN npm run build

FROM node:22-alpine AS preview
WORKDIR /app
COPY --from=build /app ./
EXPOSE 4173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
