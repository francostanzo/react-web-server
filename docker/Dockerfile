# Stage 1: Build React client
FROM node:20-alpine AS client-builder
WORKDIR /app
COPY tsconfig.base.json ./
COPY client/package*.json client/
COPY client/tsconfig*.json client/
COPY client/vite.config.ts client/
COPY client/src client/src
COPY client/index.html client/
RUN cd client && npm install && npm run build

# Stage 2: Build server
FROM node:20-alpine AS server
WORKDIR /app
COPY tsconfig.base.json ./
COPY server/package*.json server/
COPY server/tsconfig*.json server/
COPY server/src server/src
RUN cd server && npm install
RUN cd server && npm run build

# Copy React build into server/public
COPY --from=client-builder /app/client/dist /app/server/public

WORKDIR /app/server
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/index.js"]
