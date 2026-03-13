# Attractor Dockerfile
# Multi-stage build for optimized image size

# -----------------------------------------------------------------------------
# Stage 1: Base image
# -----------------------------------------------------------------------------
FROM node:20-alpine AS base

# Install production dependencies
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# -----------------------------------------------------------------------------
# Stage 2: Development (optional)
# -----------------------------------------------------------------------------
FROM base AS development

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY src ./src
COPY examples ./examples
COPY workflows ./workflows
COPY docs ./docs

# Expose ports
EXPOSE 3000 9229

# Development command
CMD ["npm", "run", "dev"]

# -----------------------------------------------------------------------------
# Stage 3: Production build
# -----------------------------------------------------------------------------
FROM base AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S attractor -u 1001

# Copy source code
COPY src ./src
COPY examples ./examples
COPY workflows ./workflows
COPY docs ./docs

# Create directories for runtime with proper permissions
RUN mkdir -p /app/logs /app/checkpoints /app/data/artifacts /app/data/state && \
    chown -R attractor:nodejs /app

# Make logs directory writable for pipeline execution
RUN chmod -R 755 /app/logs /app/checkpoints /app/data

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Switch to non-root user
USER attractor

# Expose ports
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Set environment variables for production
ENV NODE_ENV=production
ENV PORT=3000

# Start the server
CMD ["node", "src/server/index.js"]

# -----------------------------------------------------------------------------
# Stage 4: Builder (for debugging/inspecting)
# -----------------------------------------------------------------------------
FROM development AS builder

# This stage can be used to inspect the build
# Run: docker build --target builder -t attractor:builder .
