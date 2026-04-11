# Use the official Bun image
FROM oven/bun:1

# Install OpenSSL 3.0 (required for Prisma)
RUN apt-get update && apt-get install -y \
    openssl \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency files using the monorepo path
# This assumes the Build Context is the root of the repository
COPY backend/package*.json backend/bun.lock* ./

# Install dependencies
RUN bun install

# Copy the rest of the backend code
COPY backend/ .

# Generate Prisma Client
RUN bunx prisma generate

# Final setup
ENV PORT=3000
EXPOSE 3000

CMD ["bun", "src/index.ts"]
