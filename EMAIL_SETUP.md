# GitStack Email Address Setup & Trigger Map

> Domain: `gitstack.pro`
> Provider: SMTP via `fastapi_mail` (SendGrid / Mailgun / Brevo / AWS SES recommended for production)

---

## 1. Email Addresses to Create

| Address | Purpose | Email Type | Reply-To |
|---|---|---|---|
| `hello@gitstack.pro` | Welcome, onboarding, general brand emails | Marketing | `help@gitstack.pro` |
| `drop@gitstack.pro` | Daily Drop, Weekly Stack, repo digests | Content | `help@gitstack.pro` |
| `marketplace@gitstack.pro` | Purchase confirmations, setup requests, payouts, seller alerts | Transactional | `help@gitstack.pro` |
| `contact@gitstack.pro` | Contact form, partnership inquiries, press | Inbound only | Same |
| `help@gitstack.pro` | Support tickets, user questions | Inbound + outbound replies | Same |
| `noreply@gitstack.pro` | System alerts, automated notifications | Automated | `help@gitstack.pro` |

### Why These Addresses?

- **`hello@`** = The warm introduction. First thing a user sees. Human, friendly.
- **`drop@`** = Brand-aligned with "Daily Drop." Users learn to look for this in their inbox every morning.
- **`marketplace@`** = Transactional trust. When someone spends money, they want to see a dedicated commerce address.
- **`contact@`** = Public-facing. For partners, press, investors — not users.
- **`help@`** = Support single source of truth. Every email's reply-to points here.
- **`noreply@`** = For things users should NOT reply to (scraper alerts, cron failures, etc.).

---

## 2. Where Each Email Triggers From

### Marketing Emails

| Email | From Address | Triggered By | Backend File | Endpoint |
|---|---|---|---|---|
| **Welcome** | `hello@gitstack.pro` | User subscribes to newsletter | `server.py` line ~1489 | `POST /api/newsletter/subscribe` |
| **Daily Drop** | `drop@gitstack.pro` | Cron job runs daily at 9 AM IST | `email_jobs.py` (new) | Render Cron or APScheduler |
| **Weekly Stack** | `drop@gitstack.pro` | Cron job runs Monday 9 AM IST | `email_jobs.py` (new) | Render Cron or APScheduler |
| **Onboarding #1-5** | `hello@gitstack.pro` | Clerk webhook on signup | `email_jobs.py` (new) | Clerk `user.created` webhook |
| **Re-engagement** | `hello@gitstack.pro` | User inactive 14+ days | `email_jobs.py` (new) | Scheduled job |

### Transactional Emails

| Email | From Address | Triggered By | Backend File | Endpoint |
|---|---|---|---|---|
| **Purchase Confirmation** | `marketplace@gitstack.pro` | Razorpay payment verified | `server.py` line ~3627 | `POST /api/marketplace/checkout/verify-payment` |
| **Setup Request (to seller)** | `marketplace@gitstack.pro` | Buyer requests setup service | `server.py` line ~3665 | `POST /api/marketplace/setup-requests` |
| **Setup Complete (to buyer)** | `marketplace@gitstack.pro` | Seller marks setup done | `server.py` (new) | `POST /api/marketplace/setup-requests/{id}/confirm` |
| **Payout Notification** | `marketplace@gitstack.pro` | Seller requests withdrawal | `server.py` line ~3883 | `POST /api/marketplace/wallet/withdraw` |
| **New Review (to seller)** | `marketplace@gitstack.pro` | Buyer leaves review | `server.py` (new) | `POST /api/marketplace/products/{id}/reviews` |
| **Stack Reminder #1** | `hello@gitstack.pro` | User clicks "Email me this stack" | `server.py` line ~1725 | `POST /api/stacks/email-me` |
| **Stack Reminder #2** | `hello@gitstack.pro` | 48 hours after stack save | `email_jobs.py` (new) | Scheduled job |
| **Stack Reminder #3** | `hello@gitstack.pro` | 7 days after stack save, inactive | `email_jobs.py` (new) | Scheduled job |

### System / Internal Emails

| Email | From Address | Triggered By | Backend File |
|---|---|---|---|
| **Scraper failure alert** | `noreply@gitstack.pro` | GitHub scraper fails | `server.py` `_scraper_loop()` |
| **High bounce rate alert** | `noreply@gitstack.pro` | Email bounce rate >5% | `email_jobs.py` (new) |

---

## 3. DNS Records Required

Your domain `gitstack.pro` needs these DNS records for deliverability. Add them at your registrar (Cloudflare, Namecheap, etc.).

### SPF Record
```
Type: TXT
Name: gitstack.pro
Value: v=spf1 include:_spf.sendgrid.net ~all
```
*(Replace `sendgrid.net` with your provider: `mailgun.org`, `spf.mailjet.com`, `spf.brevo.com`, etc.)*

### DKIM Record
Provided by your email provider during domain verification. Usually looks like:
```
Type: TXT
Name: s1._domainkey.gitstack.pro
Value: (long key from provider)
```

### DMARC Record
```
Type: TXT
Name: _dmarc.gitstack.pro
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@gitstack.pro; ruf=mailto:dmarc@gitstack.pro; fo=1
```

### MX Records (if using Google Workspace / Zoho for contact/help inboxes)
```
Type: MX
Name: gitstack.pro
Value: 10 mx.zoho.in (or Google MX records)
```

> **Note:** `contact@` and `help@` should be REAL inboxes you monitor. `hello@`, `drop@`, `marketplace@`, `noreply@` can be sending-only addresses managed by your email provider.

---

## 4. Environment Variables

Add these to `backend/.env` and `backend/.env.example`:

```bash
# ── Email Addresses ───────────────────────────────────────────────
SMTP_FROM_EMAIL=hello@gitstack.pro
SMTP_FROM_NAME=GitStack

# Optional: override per-type senders (if not set, falls back to SMTP_FROM_EMAIL)
SMTP_DROP_EMAIL=drop@gitstack.pro
SMTP_DROP_NAME="GitStack Daily Drop"
SMTP_MARKETPLACE_EMAIL=marketplace@gitstack.pro
SMTP_MARKETPLACE_NAME="GitStack Marketplace"
SMTP_HELP_EMAIL=help@gitstack.pro
SMTP_NOREPLY_EMAIL=noreply@gitstack.pro
```

---

## 5. Current Status vs Target

| Email | Currently Sends? | Target From Address | Action Needed |
|---|---|---|---|
| Welcome | ❌ No | `hello@gitstack.pro` | Add `send_email` call in newsletter subscribe |
| Daily Drop | ❌ No | `drop@gitstack.pro` | Build cron job + template |
| Weekly Stack | ❌ No | `drop@gitstack.pro` | Build cron job + template |
| Purchase Confirmation | ✅ Yes | `marketplace@gitstack.pro` | Update template to neo-brutalist |
| Setup Request (seller) | ✅ Yes | `marketplace@gitstack.pro` | Update template |
| Setup Complete (buyer) | ❌ No | `marketplace@gitstack.pro` | Add send trigger |
| Payout | ✅ Yes | `marketplace@gitstack.pro` | Update template |
| New Review | ❌ No | `marketplace@gitstack.pro` | Add send trigger |
| Stack Reminder | ❌ No | `hello@gitstack.pro` | Add send trigger + scheduled follow-ups |
| Onboarding Drip | ❌ No | `hello@gitstack.pro` | Build Clerk webhook + 5-email series |
| Re-engagement | ❌ No | `hello@gitstack.pro` | Build inactive-user detection |

---

## 6. Email Provider — Resend ✅

**Chosen provider: [Resend](https://resend.com)**

| Provider | Free Tier | Why We Picked Resend |
|---|---|---|
| **Resend** ✅ | **3,000 emails/day** | Built for developers, Vercel team, best free tier |
| SendGrid | 100 emails/day | Too small free tier, expensive fast |
| Brevo | 300 emails/day | Bloated dashboard, slower API |
| Mailgun | 5,000 emails total (3 months) | No permanent free tier |
| AWS SES | $0.10 per 1,000 | Complex setup, AWS console hell |

**Resend SMTP Settings:**
```
Host: smtp.resend.com
Port: 587 (STARTTLS)
User: resend
Password: your Resend API key
```

**Verify your domain in Resend Dashboard:**
1. Go to [resend.com](https://resend.com) → Domains → Add Domain
2. Enter `gitstack.pro`
3. Copy the DNS records (SPF, DKIM, DMARC) into your domain registrar
4. Wait for verification (usually instant, max 24 hours)
5. Start sending
