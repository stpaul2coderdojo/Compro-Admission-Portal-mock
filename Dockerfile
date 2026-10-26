# Stage 1: Build frontend and server assets
FROM node:22-alpine AS builder
WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install dependencies (including devDependencies for Vite & TypeScript build)
RUN npm ci

# Copy application source code
COPY . .

# Build Vite client production bundle to /app/dist
RUN npm run build

# Stage 2: Production runtime
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built frontend assets and server entrypoint
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Expose standard container port
EXPOSE 3000

# Use non-root node user for container security
USER node

# Start production server
CMD ["npm", "start"]
