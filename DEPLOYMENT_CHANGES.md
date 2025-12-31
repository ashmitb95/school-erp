# Deployment Configuration Changes

This document summarizes all changes made to prepare the ERP system for deployment.

## ✅ Changes Made

### 1. Database Configuration (`shared/database/config.ts`)
- ✅ Added support for `DATABASE_URL` connection string (Supabase format)
- ✅ Maintains backward compatibility with individual env vars
- ✅ Added SSL support for Supabase connections
- ✅ Automatically detects and uses connection string if available

### 2. Redis Configuration (`shared/utils/redis.ts`)
- ✅ Added support for `REDIS_URL` connection string (Upstash format)
- ✅ Maintains backward compatibility with individual env vars
- ✅ Works with both local Redis and Upstash

### 3. Railway Configuration
- ✅ Created `Dockerfile` for containerizing all backend services
- ✅ Created `railway-start.sh` script to start all microservices
- ✅ Created `railway.json` for Railway deployment configuration
- ✅ Created `.railwayignore` to exclude unnecessary files

### 4. Vercel Configuration
- ✅ Created `web/vercel.json` for Vercel deployment
- ✅ Updated `web/vite.config.ts` to use environment variables
- ✅ Updated `web/src/services/api.ts` to use `VITE_API_URL` env var

### 5. Documentation
- ✅ Created `DEPLOYMENT.md` - Comprehensive deployment guide
- ✅ Created `DEPLOYMENT_QUICKSTART.md` - Quick reference guide
- ✅ Created `.env.example` template (blocked by gitignore, but documented)

## 📋 Files Created

```
├── Dockerfile                    # Multi-stage Docker build
├── railway-start.sh             # Startup script for all services
├── railway.json                 # Railway deployment config
├── .railwayignore               # Files to ignore in Railway
├── .dockerignore                # Files to ignore in Docker
├── DEPLOYMENT.md                # Full deployment guide
├── DEPLOYMENT_QUICKSTART.md     # Quick start guide
└── web/
    ├── vercel.json              # Vercel configuration
    └── src/services/api.ts      # Updated to use env vars
```

## 📋 Files Modified

```
├── shared/database/config.ts    # Added Supabase support
├── shared/utils/redis.ts         # Added Upstash support
└── web/vite.config.ts           # Added env var support
```

## 🔧 What You Need to Do

### 1. Set Up Services
- [ ] Create Supabase project and get `DATABASE_URL`
- [ ] Create Upstash Redis database and get `REDIS_URL`
- [ ] Generate a secure `JWT_SECRET`

### 2. Deploy Backend (Railway)
- [ ] Connect GitHub repo to Railway
- [ ] Set environment variables in Railway
- [ ] Deploy and get Railway URL
- [ ] Run database migrations

### 3. Deploy Frontend (Vercel)
- [ ] Connect GitHub repo to Vercel
- [ ] Set `VITE_API_URL` to your Railway URL
- [ ] Deploy

### 4. Configure Database
- [ ] Enable PostgreSQL extensions in Supabase
- [ ] Run migrations (via Railway CLI or Supabase SQL Editor)

## 🔑 Required Environment Variables

### Railway (Backend)
```bash
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
DB_SSL=true
REDIS_URL=rediss://default:[PASSWORD]@[ENDPOINT].upstash.io:6379
JWT_SECRET=your-secret-key-here
NODE_ENV=production
```

### Vercel (Frontend)
```bash
VITE_API_URL=https://your-railway-app.railway.app
```

## 🚀 Next Steps

1. Follow the [DEPLOYMENT_QUICKSTART.md](./DEPLOYMENT_QUICKSTART.md) for fast setup
2. Or read the full [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions
3. Test your deployment:
   - Frontend: `https://your-app.vercel.app`
   - Backend health: `https://your-app.railway.app/health`
   - API test: `https://your-app.railway.app/api/auth/login`

## 💡 Tips

- Railway auto-detects Dockerfile, so deployment should be automatic
- Vercel auto-detects Vite, so frontend deployment should be automatic
- Use Railway CLI for easier environment variable management
- Monitor Railway logs if services don't start: `railway logs`
- Supabase has a free tier with 500MB database (usually enough for small schools)
- Upstash free tier: 10K commands/day (usually enough for caching)

## 🐛 Troubleshooting

### Services not starting
- Check Railway logs: `railway logs`
- Verify all environment variables are set
- Ensure database migrations have run

### Database connection errors
- Verify `DATABASE_URL` is correct
- Check Supabase firewall settings
- Ensure `DB_SSL=true` is set

### Redis connection errors
- Verify `REDIS_URL` is correct (Upstash uses `rediss://` with double 's')
- Check Upstash dashboard for connection status

### CORS errors
- Verify `VITE_API_URL` is set correctly in Vercel
- Check API Gateway CORS configuration
- Ensure Railway URL is in allowed origins

## 📚 Additional Resources

- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Upstash Docs](https://docs.upstash.com)

