---
description: Deploy Umami analytics to umami.gitstack.pro
---

# Deploy Umami Analytics

## One-Command Setup (Docker)

```bash
# On your server (where gitstack.pro is hosted)
docker run -d \
  --name umami \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@localhost:5432/umami \
  -e APP_SECRET=your-random-secret-key \
  ghcr.io/umami-software/umami:postgresql-latest
```

## Then Configure Nginx

Add to your nginx config for `umami.gitstack.pro`:

```nginx
server {
    listen 443 ssl http2;
    server_name umami.gitstack.pro;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Get Your Website ID

1. Visit `https://umami.gitstack.pro`
2. Login with default: `admin` / `umami`
3. Add website: Enter name "GitStack", domain "gitstack.pro"
4. Copy the Website ID (looks like: `e4b0f2a1-3c8d-4e5f-6g7h-8i9j0k1l2m3n`)
5. Replace `UMAMI_WEBSITE_ID_PLACEHOLDER` in `frontend/public/index.html`
6. Rebuild and redeploy frontend

## Verify It's Working

1. Visit `gitstack.pro`
2. Open browser DevTools → Network tab
3. Filter for "umami"
4. You should see `script.js` loaded and `collect` calls firing
5. In Umami dashboard, real-time visitors should appear

## Free Alternative: Railway.app

If you don't want to self-host:
1. Go to [railway.app](https://railway.app)
2. Click "New Project" → Deploy Umami
3. Connect PostgreSQL (also on Railway)
4. Add custom domain `umami.gitstack.pro`
5. Copy Website ID to your `index.html`

Cost: ~$5/month (PostgreSQL + Umami container)
