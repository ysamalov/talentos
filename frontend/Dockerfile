FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_API_URL must be empty string so all API calls go through
# Next.js rewrites (same origin) — no CORS needed.
ENV NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_WS_URL=""

RUN npm run build

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]
