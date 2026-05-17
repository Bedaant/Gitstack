# GitStack Deployment Guide

Deploy the full GitStack stack (backend + frontend) in ~15 minutes.

---

## Prerequisites

- A **GitHub account** (to host code)
- **Node.js 18+** and **Python 3.11+** (local verification only)

---

## Step 1 — External Services (Free Tiers)

You need accounts on these services. All have generous free tiers.

| Service | Purpose | Free Tier | Sign Up |
|---------|---------|-----------|---------|
| **MongoDB Atlas** | Database | 512 MB M0 cluster | [cloud.mongodb.com](https://cloud.mongodb.com) |
| **Upstash Redis** | Caching / Rate limits | 10k cmds/day | [upstash.com](https://upstash.com) |
| **Clerk** | Authentication | 10k MAU | [clerk.com](https://clerk.com) |
| **Resend** | Transactional email | 3k emails/day | [resend.com](https://resend.com) |
| **Cloudflare R2** | File storage (marketplace) | 10 GB/mo | [dash.cloudflare.com](https://dash.cloudflare.com) |
| **Razorpay** | Payments (India) | Test mode free | [razorpay.com](https://razorpay.com) |
| **Google AI Studio** | AI / Stack generator | Free tier | [aistudio.google.com](https://aistudio.google.com) |

### 1a. MongoDB Atlas
1. Create a cluster → choose **M0 (Free)**
2. Database Access → create a user with password
3. Network Access → allow access from anywhere (`0.0.0.0/0`) or whitelist your backend IP
4. Clusters → Connect → Drivers → Python → copy the connection string
5. Replace `<password>` with your user's password → this is `MONGO_URL`

### 1b. Upstash Redis
1. Create a new Redis database
2. Copy the **REDIS URL** (format: `rediss://default:...`)
3. This is `REDIS_URL`

### 1c. Clerk
1. Create an application
2. Go to **API Keys** → copy:
   - **JWKS URL** → `CLERK_JWKS_URL`
   - **Publishable Key** → `REACT_APP_CLERK_PUBLISHABLE_KEY` (frontend)
3. Configure allowed redirect URLs to your production frontend URL

### 1d. Resend
1. Sign up → verify a domain (or use `onboarding@resend.dev` for testing)
2. API Keys → copy API key → this is `SMTP_PASSWORD`
3. Use `resend` as `SMTP_USER`

### 1e. Cloudflare R2
1. R2 → Create bucket → name it `gitstack-marketplace`
2. Settings → enable public access (or use a custom domain)
3. R2 → Manage R2 API Tokens → create token with **Object Read & Write**
4. Copy Account ID, Access Key ID, Secret Access Key
5. Copy the public URL → `R2_PUBLIC_URL`

### 1f. Razorpay (optional — only for marketplace)
1. Dashboard → Settings → API Keys → generate test keys
2. Copy Key ID and Key Secret

### 1g. Gemini
1. [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Create API key → `GEMINI_API_KEY`

---

## Step 2 — Backend Deployment

### Option A: Render (Recommended — Free Tier)

1. Push this repo to GitHub
2. Go to [dashboard.render.com/blueprint](https://dashboard.render.com/blueprint)
3. Click **New Blueprint Instance**
4. Connect your GitHub repo
5. Render detects `render.yaml` and shows the service `gitstack-api`
6. Click **Apply**
7. After deploy, go to the service → **Environment** → add all the secrets from Step 1
8. The service will auto-restart with the new env vars

**Health check:** Visit `https://your-service-name.onrender.com/health`

### Option B: Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Set root directory to `backend`
3. Add environment variables from Step 1
4. Deploy

### Option C: Koyeb

1. Go to [koyeb.com](https://koyeb.com) → Create App
2. Select GitHub repo → set **Build & Run directory** to `backend`
3. Use **Docker** builder (detects `Dockerfile`)
4. Add environment variables
5. Deploy

### Option D: Docker (Any VPS / Self-Hosted)

```bash
cd backend
docker build -t gitstack-api .
docker run -p 10000:10000 --env-file .env gitstack-api
```

---

## Step 3 — Frontend Deployment (Vercel)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → Add New Project → Import Git Repository
3. Select the repo → set **Root Directory** to `frontend`
4. Framework Preset: **Create React App**
5. Add Environment Variables:
   - `REACT_APP_BACKEND_URL` = your backend URL (e.g. `https://gitstack-api.onrender.com`)
   - `REACT_APP_CLERK_PUBLISHABLE_KEY` = from Clerk dashboard
6. Click **Deploy**

**Note:** Vercel reads `vercel.json` from the repo for SPA routing and security headers.

---

## Step 4 — Connect Frontend ↔ Backend

1. Copy your **Vercel production URL** (e.g. `https://gitstack.vercel.app`)
2. Go to your **backend dashboard** (Render/Railway/Koyeb)
3. Add/update environment variable:
   - `CORS_ORIGINS` = `https://gitstack.vercel.app`
   - `FRONTEND_URL` = `https://gitstack.vercel.app`
4. Restart the backend service

5. Go to **Clerk Dashboard** → your app → **URLs**
6. Add your Vercel URL to:
   - Home URL
   - Allowed redirect URLs
   - Allowed origins (CORS)

---

## Step 5 — Post-Deploy Verification

Run this checklist:

- [ ] `GET https://your-backend.com/health` returns `{"status":"healthy"}`
- [ ] Frontend loads without console errors
- [ ] Stack Generator works (generates tools + master prompt)
- [ ] Clerk sign-up / sign-in works
- [ ] Solution Finder returns results
- [ ] Blog page loads
- [ ] Marketplace loads (if configured)

### Quick smoke test (curl)

```bash
# Health
curl https://your-backend.com/health

# Stack generator (no auth required)
curl -X POST https://your-backend.com/stacks/generate \
  -H "Content-Type: application/json" \
  -d '{"idea":"Build a habit tracker app","budget":"$0 (free only)"}'

# Solution finder
curl "https://your-backend.com/solutions?query=habit%20tracker"
```

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URL` | **Yes** | MongoDB Atlas connection string |
| `DB_NAME` | Yes | Database name (default: `gitstack`) |
| `GEMINI_API_KEY` | **Yes** | Google Gemini API key |
| `CLERK_JWKS_URL` | **Yes** | Clerk JWKS endpoint |
| `CORS_ORIGINS` | **Yes** | Your frontend URL(s), comma-separated |
| `REDIS_URL` | **Yes** | Redis/Upstash connection string |
| `GITHUB_TOKEN` | No | Raises GitHub API rate limit from 60 → 5000/hr |
| `FRONTEND_URL` | Yes | Your Vercel URL (for Razorpay redirects) |
| `ADMIN_EMAILS` | No | Comma-separated admin emails |
| `SMTP_PASSWORD` | No | Resend API key (for email features) |
| `RAZORPAY_KEY_ID` | No | For marketplace payments |
| `RAZORPAY_KEY_SECRET` | No | For marketplace payments |
| `R2_*` | No | For marketplace file storage |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `REACT_APP_BACKEND_URL` | **Yes** | Backend API URL |
| `REACT_APP_CLERK_PUBLISHABLE_KEY` | **Yes** | Clerk publishable key |

---

## Troubleshooting

### Backend shows "MongoDB connection failed"
- Check `MONGO_URL` is correct
- Ensure IP whitelist in MongoDB Atlas includes `0.0.0.0/0` (or your platform's egress IPs)
- Check `DB_NAME` matches the database in your connection string

### CORS errors in browser
- Ensure `CORS_ORIGINS` includes your exact Vercel URL (including `https://`)
- No trailing slash in the origin

### Clerk auth not working
- Verify `CLERK_JWKS_URL` matches your Clerk app (not a different instance)
- Ensure frontend Clerk key and backend JWKS URL are from the **same Clerk application**
- Check Clerk Dashboard → URLs → allowed origins

### Redis errors (endpoint caching fails)
- The app falls back to in-memory caching if Redis is unavailable
- For production, set a valid `REDIS_URL` for shared caching across instances

### "Build failed" on Vercel
- Check `frontend/vercel.json` exists and is valid JSON
- Ensure `frontend/package.json` has a `build` script
- Check build logs for specific ESLint errors

### 502 Bad Gateway / Backend won't start
- Check backend logs for the exact error
- Verify all required env vars are set (not just present, but have valid values)
- `PORT` env var is set automatically by Render/Railway/Koyeb — don't override unless self-hosting

---

## Architecture

```
┌─────────────┐      HTTPS       ┌─────────────┐
│   Vercel    │ ◄──────────────► │   Render    │
│  (Frontend) │   CORS_ORIGINS   │  (Backend)  │
│  React SPA  │                  │  FastAPI    │
└─────────────┘                  └──────┬──────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
              ┌─────────┐       ┌──────────┐       ┌──────────┐
              │ MongoDB │       │  Redis   │       │  Clerk   │
              │ (Atlas) │       │ (Upstash)│       │  (Auth)  │
              └─────────┘       └──────────┘       └──────────┘
```

---

## Next Steps

1. **Custom domain**: Connect your domain to Vercel (frontend) and Render (backend)
2. **Monitoring**: Add Sentry or LogRocket for error tracking
3. **Analytics**: The app already uses Plausible — add your domain at [plausible.io](https://plausible.io)
4. **Backups**: Enable MongoDB Atlas automated backups
5. **CDN**: Use Cloudflare in front of Vercel for global caching

---

## Support

- Backend logs: Check your platform dashboard (Render/Railway/Koyeb)
- Frontend issues: Browser DevTools → Console / Network
- API docs: Visit `/docs` on your backend (FastAPI auto-generated Swagger UI)
