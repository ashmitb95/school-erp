# Multi-stage build for ERP Backend Services
FROM node:18-alpine AS base

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY tsconfig.json ./

# Copy all package.json files for workspaces (needed for npm install to resolve dependencies)
COPY shared/package.json ./shared/
COPY shared/tsconfig.json ./shared/
COPY services/api-gateway/package.json ./services/api-gateway/
COPY services/api-gateway/tsconfig.json ./services/api-gateway/
COPY services/auth/package.json ./services/auth/
COPY services/auth/tsconfig.json ./services/auth/
COPY services/student/package.json ./services/student/
COPY services/student/tsconfig.json ./services/student/
COPY services/fees/package.json ./services/fees/
COPY services/fees/tsconfig.json ./services/fees/
COPY services/attendance/package.json ./services/attendance/
COPY services/attendance/tsconfig.json ./services/attendance/
COPY services/exam/package.json ./services/exam/
COPY services/exam/tsconfig.json ./services/exam/
COPY services/ai/package.json ./services/ai/
COPY services/ai/tsconfig.json ./services/ai/
COPY services/management/package.json ./services/management/
COPY services/management/tsconfig.json ./services/management/

# Install all dependencies (workspaces will be installed automatically)
RUN npm install

# Copy all source files
COPY shared ./shared
COPY services ./services

# Build shared package first (needed by services)
RUN echo "Building shared package..." && \
    cd shared && \
    npm run build && \
    echo "✓ Shared package built successfully" && \
    cd ..

# Build all services with error handling
RUN echo "Building all services..." && \
    services_built=0 && \
    for dir in services/*/; do \
      if [ -f "$dir/package.json" ] && [ -f "$dir/tsconfig.json" ]; then \
        service_name=$(basename "$dir") && \
        echo "Building $service_name..." && \
        cd "$dir" && \
        if npm run build; then \
          if [ ! -d "dist" ] || [ -z "$(ls -A dist 2>/dev/null)" ]; then \
            echo "ERROR: $service_name build failed - no dist directory or empty" && \
            exit 1; \
          fi && \
          echo "✓ $service_name built successfully" && \
          services_built=$((services_built + 1)); \
        else \
          echo "ERROR: $service_name build failed with exit code $?" && \
          exit 1; \
        fi && \
        cd ../..; \
      else \
        echo "⚠ Skipping $dir (missing package.json or tsconfig.json)"; \
      fi; \
    done && \
    echo "✓ All $services_built services built successfully" && \
    echo "Verifying build outputs..." && \
    for dir in services/*/; do \
      if [ -f "$dir/package.json" ] && [ -f "$dir/tsconfig.json" ]; then \
        service_name=$(basename "$dir") && \
        if [ ! -d "$dir/dist" ]; then \
          echo "ERROR: $service_name dist directory missing!" && \
          exit 1; \
        fi && \
        if [ -z "$(ls -A "$dir/dist" 2>/dev/null)" ]; then \
          echo "ERROR: $service_name dist directory is empty!" && \
          exit 1; \
        fi; \
      fi; \
    done && \
    echo "✓ All build outputs verified"

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy root dependencies
COPY --from=base /app/package*.json ./
COPY --from=base /app/node_modules ./node_modules

# Copy built shared package (including dist)
COPY --from=base /app/shared ./shared

# Copy built services (including dist directories)
COPY --from=base /app/services ./services

# Verify all dist directories exist
RUN echo "Verifying production build..." && \
    echo "Shared package:" && \
    ls -la shared/dist/ 2>/dev/null || echo "⚠ Shared dist missing" && \
    for dir in services/*/; do \
      if [ -f "$dir/package.json" ]; then \
        service_name=$(basename "$dir") && \
        if [ -d "$dir/dist" ] && [ -n "$(ls -A "$dir/dist" 2>/dev/null)" ]; then \
          echo "✓ $service_name: dist exists"; \
        else \
          echo "✗ $service_name: dist missing or empty!" && \
          exit 1; \
        fi; \
      fi; \
    done && \
    echo "✓ Production build verified"

# Copy startup script
COPY railway-start.sh ./
RUN chmod +x railway-start.sh

# Expose ports for all services
EXPOSE 3000 3001 3002 3003 3004 3005 3006 3007

# Start all services
CMD ["./railway-start.sh"]

