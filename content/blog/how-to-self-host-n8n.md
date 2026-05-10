---
title: "How to Self-Host n8n in 10 Minutes"
description: "Step-by-step guide to deploying n8n on Railway, Render, or Docker. Start automating for free today."
date: "2026-05-08"
author: "GitStack Team"
tags: ["n8n", "self-hosting", "automation", "tutorial", "railway"]
image: "/og-image.svg"
---

# How to Self-Host n8n in 10 Minutes

n8n is the most popular open-source alternative to Zapier. This guide walks you through deploying it on Railway — the fastest, easiest method.

## Prerequisites

- A Railway account (free tier works)
- A GitHub account

## Step 1: Fork the n8n Template

Railway has a one-click n8n template. Search "n8n" in Railway's template library and click Deploy.

## Step 2: Configure Environment Variables

Set these required variables:

- `N8N_BASIC_AUTH_ACTIVE`: true
- `N8N_BASIC_AUTH_USER`: your-username
- `N8N_BASIC_AUTH_PASSWORD`: your-secure-password
- `WEBHOOK_URL`: Your Railway domain (e.g., https://n8n-production.up.railway.app)

## Step 3: Deploy

Click Deploy. Railway will build and start n8n automatically. In 2–3 minutes, visit your domain and log in.

## Step 4: Create Your First Workflow

1. Click "Add Workflow"
2. Choose a trigger (e.g., Schedule, Webhook, or HTTP Request)
3. Add nodes for the services you want to connect
4. Activate the workflow

## Alternative: Docker Deploy

If you prefer full control, run:

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

## Next Steps

- Set up HTTPS with a custom domain
- Configure SMTP for email notifications
- Explore the 400+ built-in integrations

Need help choosing the right automation stack? Use GitStack's Stack Generator to get a personalized recommendation.
