FROM node:24-bookworm-slim AS builder
WORKDIR /app

ARG BACKEND_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_LANDING_PAGE_URL
ENV BACKEND_URL=$BACKEND_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_LANDING_PAGE_URL=$NEXT_PUBLIC_LANDING_PAGE_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ARG BACKEND_URL
ENV BACKEND_URL=$BACKEND_URL

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs

EXPOSE 3000
CMD ["npm", "start"]
