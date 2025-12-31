# Railway Monorepo Setup (If You Want Individual Services)

If you want to deploy services individually, here's how to set it up:

## Quick Setup Script

Run this to create individual Dockerfiles:

```bash
#!/bin/bash
# create-service-dockerfiles.sh

SERVICES=("api-gateway" "auth" "student" "fees" "attendance" "exam" "ai" "management")
PORTS=(3000 3001 3002 3003 3004 3005 3006 3007)

for i in "${!SERVICES[@]}"; do
  SERVICE=${SERVICES[$i]}
  PORT=${PORTS[$i]}
  
  cat > "services/$SERVICE/Dockerfile" << EOF
FROM node:18-alpine AS base
WORKDIR /app

# Copy root files
COPY package*.json ./
COPY tsconfig.json ./

# Copy shared
COPY shared/package.json ./shared/
COPY shared/tsconfig.json ./shared/
COPY shared ./shared

# Copy this service
COPY services/$SERVICE/package.json ./services/$SERVICE/
COPY services/$SERVICE/tsconfig.json ./services/$SERVICE/
COPY services/$SERVICE ./services/$SERVICE/

# Install and build
RUN npm install
RUN cd shared && npm run build
RUN cd services/$SERVICE && npm run build

# Production
FROM node:18-alpine
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/shared ./shared
COPY --from=base /app/services/$SERVICE ./services/$SERVICE
COPY --from=base /app/package*.json ./

EXPOSE $PORT
CMD ["node", "services/$SERVICE/dist/index.js"]
EOF

  cat > "services/$SERVICE/railway.json" << EOF
{
  "\$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "node services/$SERVICE/dist/index.js",
    "restartPolicyType": "ON_FAILURE"
  }
}
EOF

  echo "Created Dockerfile and railway.json for $SERVICE"
done
```

## Deployment Steps

1. **Create services in Railway:**
   - Go to Railway dashboard
   - Create new project
   - For each service:
     - Click "New" → "GitHub Repo"
     - Select your repo
     - Set **Root Directory** to `services/[service-name]`
     - Railway will auto-detect the Dockerfile

2. **Set environment variables:**
   - Each service needs: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `NODE_ENV`
   - API Gateway also needs service URLs:
     ```
     AUTH_SERVICE_URL=https://auth-service.railway.app
     STUDENT_SERVICE_URL=https://student-service.railway.app
     # etc.
     ```

3. **Update API Gateway:**
   - Modify `services/api-gateway/src/index.ts` to use env vars for service URLs
   - Use `process.env.AUTH_SERVICE_URL` instead of localhost

## Alternative: Use Railway's Service Discovery

Railway provides private networking. Services can discover each other using:
- Service name as hostname
- Example: `http://auth-service:3001`

But this requires Railway's private networking setup.

