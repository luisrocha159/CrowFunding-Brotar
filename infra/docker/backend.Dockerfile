FROM node:24.13.0-alpine AS build
WORKDIR /app
COPY backend/package.json backend/pnpm-lock.yaml ./
RUN corepack pnpm install --frozen-lockfile
COPY backend/tsconfig*.json ./
COPY backend/src ./src
RUN corepack pnpm run build && corepack pnpm prune --prod

FROM node:24.13.0-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
CMD ["node", "dist/main.js"]
