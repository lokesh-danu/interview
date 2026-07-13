FROM oven/bun:1 as base

WORKDIR /app

# Install dependencies
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build
RUN bun run build

# Production stage
FROM oven/bun:1-slim

WORKDIR /app

# Copy built files
COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./

# Expose port
EXPOSE 3001

# Start server
CMD ["bun", "run", "dist/index.js"]
