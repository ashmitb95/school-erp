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
RUN cd shared && npm run build

# Build all services
RUN for dir in services/*/; do \
      if [ -f "$dir/package.json" ] && [ -f "$dir/tsconfig.json" ]; then \
        cd "$dir" && npm run build && cd ../..; \
      fi; \
    done

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy root dependencies
COPY --from=base /app/package*.json ./
COPY --from=base /app/node_modules ./node_modules

# Copy built shared package
COPY --from=base /app/shared ./shared

# Copy built services
COPY --from=base /app/services ./services

# Copy startup script
COPY railway-start.sh ./
RUN chmod +x railway-start.sh

# Expose ports for all services
EXPOSE 3000 3001 3002 3003 3004 3005 3006 3007

# Start all services
CMD ["./railway-start.sh"]

