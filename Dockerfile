# Multi-stage build for Consolidated ERP Server
FROM node:18-alpine AS base

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY tsconfig.json ./

# Copy all package.json files for workspaces
COPY shared/package.json ./shared/
COPY shared/tsconfig.json ./shared/
COPY services/package.json ./services/
COPY services/tsconfig.json ./services/

# Install all dependencies (workspaces)
RUN npm install

# Copy all source files
COPY shared ./shared
COPY services ./services

# Build shared package first
RUN echo "Building shared package..." && \
    cd shared && \
    npm run build && \
    echo "✓ Shared package built successfully" && \
    cd ..

# Build server
RUN echo "Building server..." && \
    cd services && \
    npm run build && \
    if [ ! -d "dist" ] || [ -z "$(ls -A dist 2>/dev/null)" ]; then \
    echo "ERROR: Server build failed - no dist directory or empty" && \
    exit 1; \
    fi && \
    echo "✓ Server built successfully" && \
    cd ..

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy root dependencies
COPY --from=base /app/package*.json ./
COPY --from=base /app/node_modules ./node_modules

# Copy built shared package
COPY --from=base /app/shared ./shared

# Copy built server
COPY --from=base /app/services ./services

# Verify build
RUN echo "Verifying production build..." && \
    if [ ! -d "shared/dist" ] || [ -z "$(ls -A shared/dist 2>/dev/null)" ]; then \
    echo "ERROR: Shared dist missing or empty!" && \
    exit 1; \
    fi && \
    if [ ! -d "services/dist" ] || [ -z "$(ls -A services/dist 2>/dev/null)" ]; then \
    echo "ERROR: Server dist missing or empty!" && \
    exit 1; \
    fi && \
    echo "✓ Production build verified"

# Copy startup script
COPY railway-start.sh ./
RUN chmod +x railway-start.sh

# Expose port
EXPOSE 3000

# Start server
CMD ["./railway-start.sh"]
