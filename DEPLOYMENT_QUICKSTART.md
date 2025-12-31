# Quick Deployment Guide

## 🚀 Fast Setup (5 minutes)

### 1. Supabase Setup
```bash
# 1. Create project at https://supabase.com
# 2. Go to Project Settings > Database
# 3. Copy Connection String
# 4. Run in SQL Editor:
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### 2. Upstash Setup
```bash
# 1. Create database at https://upstash.com
# 2. Copy Redis URL (rediss://...)
```

### 3. Railway Deployment
```bash
# Option A: Via Dashboard
1. Go to railway.app > New Project > GitHub Repo
2. Select your repository
3. Add environment variables (see below)
4. Deploy!

# Option B: Via CLI
npm i -g @railway/cli
railway login
railway init
railway link
railway up
```

### 4. Railway Environment Variables
Add these in Railway dashboard:
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
DB_SSL=true
REDIS_URL=rediss://default:[PASSWORD]@[ENDPOINT].upstash.io:6379
JWT_SECRET=your-secret-key-here
NODE_ENV=production
```

### 5. Vercel Deployment
```bash
# Option A: Via Dashboard
1. Go to vercel.com > Import Project
2. Select repository
3. Set Root Directory: web
4. Add environment variable:
   VITE_API_URL=https://your-railway-app.railway.app
5. Deploy!

# Option B: Via CLI
cd web
npm i -g vercel
vercel
vercel env add VITE_API_URL
# Enter: https://your-railway-app.railway.app
```

### 6. Run Migrations
```bash
# Via Railway CLI
railway run npm run migrate

# Or via Supabase SQL Editor (copy from scripts/create-tables.sql)
```

## ✅ Verify
- Frontend: https://your-app.vercel.app
- Backend: https://your-app.railway.app/health
- API: https://your-app.railway.app/api/auth/login

## 💰 Cost
- **Free**: Vercel, Supabase (500MB), Upstash (10K/day)
- **~$5/month**: Railway (usually covered by free credit)

## 📚 Full Guide
See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

