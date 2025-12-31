# Deployment Guide

This guide covers deploying the ERP system to production using:
- **Vercel**: Frontend hosting
- **Railway**: Backend services hosting
- **Supabase**: PostgreSQL database
- **Upstash**: Redis cache

## Prerequisites

1. GitHub account (for connecting repositories)
2. Vercel account (free tier available)
3. Railway account (free $5/month credit)
4. Supabase account (free tier: 500MB database)
5. Upstash account (free tier: 10K commands/day)

## Step 1: Set Up Supabase Database

1. Go to [Supabase](https://supabase.com) and create a new project
2. Wait for the database to be provisioned
3. Go to **Project Settings** > **Database**
4. Copy the **Connection String** (URI format)
   - Format: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
5. Note: You'll need to replace `[PASSWORD]` with your actual database password

### Enable Required Extensions

Connect to your Supabase database using the SQL Editor and run:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### Run Migrations

You can run migrations using the Supabase SQL Editor or via Railway:

```bash
# From your local machine (if you have access)
npm run migrate
```

Or use Supabase's migration tool or run the SQL scripts directly in the SQL Editor.

## Step 2: Set Up Upstash Redis

1. Go to [Upstash](https://upstash.com) and create a new Redis database
2. Choose **Regional** (free tier) or **Global** (paid)
3. Once created, go to your database dashboard
4. Copy the **REST API URL** or **Redis URL**
   - Format: `rediss://default:[PASSWORD]@[ENDPOINT].upstash.io:6379`

## Step 3: Deploy Backend to Railway

### Option A: Deploy via Railway Dashboard

1. Go to [Railway](https://railway.app) and create a new project
2. Click **New** > **GitHub Repo** and connect your repository
3. Railway will auto-detect the Dockerfile
4. Add environment variables (see Step 4)
5. Deploy!

### Option B: Deploy via Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Link to existing project or create new
railway link

# Set environment variables (see Step 4)
railway variables set DATABASE_URL="postgresql://..."
railway variables set REDIS_URL="rediss://..."

# Deploy
railway up
```

### Railway Environment Variables

Set these in Railway dashboard or via CLI:

```bash
# Database (Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
DB_SSL=true

# Redis (Upstash)
REDIS_URL=rediss://default:[PASSWORD]@[ENDPOINT].upstash.io:6379

# JWT
JWT_SECRET=your-very-secure-secret-key-here
JWT_EXPIRES_IN=7d

# Service Ports (Railway will set PORT automatically, but you can override)
API_GATEWAY_PORT=3000
AUTH_SERVICE_PORT=3001
STUDENT_SERVICE_PORT=3002
FEES_SERVICE_PORT=3003
ATTENDANCE_SERVICE_PORT=3004
EXAM_SERVICE_PORT=3005
AI_SERVICE_PORT=3006
MANAGEMENT_SERVICE_PORT=3007

# Node Environment
NODE_ENV=production

# Optional: Payment Gateways
RAZORPAY_KEY_ID=your-key
RAZORPAY_KEY_SECRET=your-secret
STRIPE_PUBLIC_KEY=your-key
STRIPE_SECRET_KEY=your-secret

# Optional: AI/LLM
OPENAI_API_KEY=your-key
ANTHROPIC_API_KEY=your-key
LLM_API_URL=your-url
```

### Get Railway Deployment URL

After deployment, Railway will provide a URL like:
- `https://your-app-name.railway.app`

Note this URL - you'll need it for the frontend configuration.

## Step 4: Deploy Frontend to Vercel

### Option A: Deploy via Vercel Dashboard

1. Go to [Vercel](https://vercel.com) and import your GitHub repository
2. Set the **Root Directory** to `web`
3. Configure build settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. Add environment variables:
   - `VITE_API_URL`: Your Railway backend URL (e.g., `https://your-app-name.railway.app`)
5. Deploy!

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (from web directory)
cd web
vercel

# Set environment variables
vercel env add VITE_API_URL
# Enter: https://your-app-name.railway.app
```

### Update API Gateway for Production

Update `web/vite.config.ts` to use the production API URL:

```typescript
export default defineConfig({
  // ... existing config
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

## Step 5: Configure CORS

The API Gateway already has CORS enabled, but make sure your Railway URL is allowed. Update `services/api-gateway/src/index.ts` if needed:

```typescript
app.register(cors, {
  origin: [
    'http://localhost:5173',
    'https://your-vercel-app.vercel.app',
    // Add your Vercel domain here
  ],
  credentials: true,
});
```

Or use `origin: true` to allow all origins (less secure but easier for development).

## Step 6: Run Database Migrations

After deploying, run your database migrations:

### Option 1: Via Railway (Recommended)

1. Go to Railway dashboard
2. Open your service
3. Go to **Deployments** > **Latest** > **View Logs**
4. Or use Railway CLI:

```bash
railway run npm run migrate
```

### Option 2: Via Supabase SQL Editor

Copy and paste the SQL from:
- `scripts/create-tables.sql`
- `shared/database/init.sql`

Run them in the Supabase SQL Editor.

## Step 7: Seed Database (Optional)

If you want to seed initial data:

```bash
# Via Railway CLI
railway run npm run seed
```

Or connect to Supabase and run SQL scripts manually.

## Step 8: Verify Deployment

1. **Frontend**: Visit your Vercel URL
2. **Backend Health**: Visit `https://your-railway-app.railway.app/health`
3. **API**: Test an endpoint like `https://your-railway-app.railway.app/api/auth/login`

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Check Supabase firewall settings (should allow all IPs or add Railway IPs)
- Ensure `DB_SSL=true` is set for Supabase

### Redis Connection Issues

- Verify `REDIS_URL` is correct
- Upstash uses `rediss://` (with double 's') for SSL
- Check Upstash dashboard for connection status

### Service Not Starting

- Check Railway logs: `railway logs`
- Verify all environment variables are set
- Ensure ports are correctly configured
- Check that all services built successfully

### CORS Errors

- Update CORS configuration in API Gateway
- Verify `VITE_API_URL` is set correctly in Vercel
- Check browser console for specific CORS errors

## Cost Estimation

### Free Tier Limits

- **Vercel**: Unlimited for hobby projects
- **Railway**: $5/month free credit (usually enough for small apps)
- **Supabase**: 500MB database, 2GB bandwidth
- **Upstash**: 10K commands/day, 256MB storage

### Expected Monthly Cost

For a small school ERP:
- **Vercel**: $0 (free tier)
- **Railway**: $0-5 (free credit usually covers it)
- **Supabase**: $0 (free tier)
- **Upstash**: $0 (free tier)

**Total: $0-5/month** 🎉

## Monitoring

### Railway

- View logs: Railway dashboard > Your service > Logs
- Monitor usage: Railway dashboard > Usage

### Supabase

- Database usage: Supabase dashboard > Database > Usage
- API logs: Supabase dashboard > Logs

### Upstash

- Command usage: Upstash dashboard > Your database > Metrics
- Latency: Upstash dashboard > Your database > Metrics

## Next Steps

1. Set up custom domains (optional)
2. Configure SSL certificates (automatic on Vercel/Railway)
3. Set up monitoring and alerts
4. Configure backups (Supabase has automatic backups)
5. Set up CI/CD pipelines

## Support

- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- Upstash Docs: https://docs.upstash.com

