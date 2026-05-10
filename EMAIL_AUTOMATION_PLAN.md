# GitStack Email Automation System — Rethought Implementation Plan

> **Status:** Updated after syncing with `origin/main`. The codebase is far more complete than the local copy suggested. This plan builds on what actually exists.

---

## What Actually Exists (Post-GitHub Sync)

### Email Infrastructure
| Component | Status | Details |
|---|---|---|
| `backend/utils/email.py` | ✅ Exists | Uses `fastapi_mail` + SMTP. Has `send_email()`, `send_purchase_confirmation()`, `send_setup_request_notification()`, `send_payout_notification()` |
| SMTP config | ⚠️ Partial | Configured for Mailtrap by default. Needs real SMTP credentials (Resend/SendGrid/FastMail) for production |
| Newsletter signup | ✅ Stores emails | `POST /api/newsletter/subscribe` → `newsletter_subscribers` collection |
| "Email me this stack" | ✅ Stores emails | `POST /api/stacks/email-me` → `email_stacks` collection + auto-subscribes to newsletter |
| Marketplace emails | ✅ Partial | Purchase confirmation, setup request, payout emails exist but are basic HTML |

### Auth
| Component | Status | Details |
|---|---|---|
| Clerk auth | ✅ Integrated | `ClerkProvider` in `App.js`, `RequireAuth` component, `/dashboard` protected |
| User profiles | ✅ Live | `/u/:userId`, `UserProfilePage.js`, `users` collection in MongoDB |
| Auth context | ✅ Real | `useAuth()` hook returns actual Clerk user |

### Marketplace
| Component | Status | Details |
|---|---|---|
| Discovery page | ✅ Live | `/marketplace` with `VirtualProductGrid`, filters, search |
| Product detail | ✅ Live | `/marketplace/:productId` with reviews, seller card, checkout |
| Seller dashboard | ✅ Live | `/sell` with `CreateProductWizard`, `MyListingsTab`, `WalletTab` |
| Checkout | ✅ Live | Razorpay integration, `POST /marketplace/checkout/create-order`, `/verify-payment`, `/webhook/razorpay` |
| Setup requests | ✅ Live | Buyers can request setup services, sellers manage via dashboard |

### Other Features I Missed
- **Repo X-Ray** (`/repo-xray`, `xray/` directory)
- **README Badge Action** (`actions/readme-badge/`)
- **Alternatives Page** (`/alternatives/:tool`)
- **Embed Repo** (`/embed/r/:owner/:repo`)
- **Legal pages** (`/terms`, `/privacy`, `/about`)
- **Newsletter popup** (`NewsletterPopup.js`)
- **Theme toggle** (dark/light mode via `next-themes`)

---

## The Rethought Plan: Build on Reality

### Guiding Principles
1. **Don't replace `utils/email.py`** — Enhance it. The SMTP setup works; we just need better templates and more send triggers.
2. **Close broken loops first** — Newsletter subscribers and stack-savers have given us their emails and received nothing.
3. **Leverage Clerk auth** — Personalization is now possible because users actually log in.
4. **Enhance marketplace emails** — They exist but look like plain Bootstrap. Make them feel like GitStack.
5. **Neo-brutalist everything** — Every email must feel like it came from the app.

---

## Phase 1: Fix the Broken Promises (Week 1)

### 1.1 Welcome Email on Newsletter Signup

Current behavior: `POST /api/newsletter/subscribe` stores the email. Sends nothing.

**Fix:** After inserting into `newsletter_subscribers`, send a welcome email.

**Template:** Neo-brutalist welcome with CTA to today's Repo of the Day.
- Subject: "Welcome to GitStack — Your first Daily Drop lands tomorrow"
- Body: GitStack logo, "You joined 4,300+ founders", CTA to `/repo-of-the-day`
- Reply-to: `hello@gitstack.pro`

### 1.2 "Email Me This Stack" Actually Sends

Current behavior: Stores in `email_stacks` and `newsletter_subscribers`. Never emails.

**Fix:** After insert, immediately email the stack.

**Template:** Stack summary email with each tool's name, description, and a deep link back to Stack Generator with their idea pre-filled.
- Subject: "Your stack: {idea_summary}"
- Body: Neo-brutalist card for each tool, total setup time, CTA "Start building →"

### 1.3 Add Missing Marketplace Email Triggers

The marketplace backend has endpoints that create records but don't always trigger emails:

| Event | Current Email Status | Fix |
|---|---|---|
| Purchase confirmed | ✅ `send_purchase_confirmation()` called | Upgrade template to neo-brutalist |
| Setup request created | ✅ `send_setup_request_notification()` called | Upgrade template |
| Payout initiated | ✅ `send_payout_notification()` called | Upgrade template |
| Product approved/rejected | ❌ Not implemented | Add seller notification |
| Review received | ❌ Not implemented | Add seller notification |
| Setup request completed | ❌ Not implemented | Add buyer "your setup is ready" email |

---

## Phase 2: The Daily Drop (Week 2)

### What It Is
A daily email featuring:
1. **Repo of the Day** (already curated daily in `repo_of_the_day` collection)
2. **One trending tool** from `github_repos` HOT tier
3. **One hand-picked tool** from `tools` with a `paid_alternative`

### Why This Works Now
- `repo_of_the_day` exists and refreshes daily
- `repo_translations` has AI plain-English summaries (7-day cache)
- `github_repos` has HOT tier + star velocity
- `tools` has `paid_alternative`, `setup_time_minutes`, `what_you_can_build`

### Curation Logic
```python
async def get_daily_drop():
    today = datetime.utcnow().strftime("%Y-%m-%d")
    rod = await db.repo_of_the_day.find_one({"date": today})
    
    trending = await db.github_repos.find_one(
        {"tier": "hot", "stars": {"$gte": 100}},
        sort=[("score", -1)]
    )
    
    tool = await db.tools.find_one(
        {"paid_alternative": {"$exists": True}},
        sort=[("setup_time_minutes", 1)]
    )
    
    return {"repo_of_the_day": rod, "trending": trending, "tool": tool}
```

### Template Rules
- Inline styles only (no `<style>` tags)
- Max width 600px, single column
- Neo-brutalist: 2px black borders, hard shadows (`4px 4px 0px 0px #09090B`), pastel backgrounds
- Every tool card: name, one-sentence business value, "Replaces: $X/mo", star count, CTA

### Scheduling

**Option A: Render Cron (Recommended)**
Add to `render.yaml`:
```yaml
cronJobs:
  - type: cron
    name: gitstack-daily-drop
    runtime: python
    rootDir: backend
    schedule: "0 4 * * *"  # 9:30 AM IST
    buildCommand: pip install -r requirements.txt
    startCommand: python -c "import asyncio; from email_jobs import send_daily_drop; asyncio.run(send_daily_drop())"
```

**Option B: APScheduler (if Render Cron is unavailable)**
Add `APScheduler==3.10.4` to `requirements.txt` and schedule in `server.py` lifespan.

### Database Additions

**Enhance `newsletter_subscribers`:**
```json
{
  "email": "user@example.com",
  "status": "active|unsubscribed|bounced",
  "unsubscribe_token": "signed-jwt",
  "preferences": {
    "daily_drop": true,
    "stack_reminders": true,
    "product_updates": false
  },
  "last_sent_at": "2026-05-10T09:00:00Z",
  "source": "footer|popup|email_stack|onboarding"
}
```

**New `email_logs` collection:**
```json
{
  "email_type": "daily_drop|welcome|stack_reminder|purchase_confirmation",
  "recipient_email": "user@example.com",
  "subject": "...",
  "sent_at": "2026-05-10T09:00:00Z",
  "resend_id": "uuid",
  "status": "sent|bounced|failed"
}
```

---

## Phase 3: Token-Based Preferences (Week 2)

### Why Token-Based Even With Clerk?

Not all subscribers are logged-in users. The newsletter signup on the homepage and the popup collect emails from anonymous visitors. We need a way for them to manage preferences without creating an account.

**Solution:** Every email contains a secure token link:
- `https://gitstack.dev/preferences?token=abc123` → manage preferences
- `https://github.dev/unsubscribe?token=abc123` → one-click unsubscribe

The token is a JWT signed with a server secret, containing the email address.

### New Frontend Pages

1. **`/preferences?token=xyz`**
   - Fetches current prefs from backend
   - Toggle: Daily Drop, Stack Reminders, Product Updates
   - "Save" button
   - Link to unsubscribe

2. **`/unsubscribe?token=xyz`**
   - One-click unsubscribe
   - Shows "We're sad to see you go" with re-subscribe option
   - Neo-brutalist styling

### New Backend Endpoints

```python
GET  /api/newsletter/preferences?token=xyz    # Return current prefs
PUT  /api/newsletter/preferences              # Update prefs with token
GET  /api/newsletter/unsubscribe?token=xyz    # Unsubscribe
```

---

## Phase 4: Stack Reminder Follow-Up (Week 3)

### The `email_stacks` Collection

People have saved stacks with their emails. They expected to receive them.

**Email 1 (Immediate):** "Here's your stack: {idea}"
- Full stack with tool cards
- Deep link to Stack Generator with idea pre-filled
- CTA: "Start building →"

**Email 2 (48 hours later):** "Still building {idea}?"
- Stack recap + 1 related tool recommendation
- CTA: "Browse similar ideas →" (`/idea-exists`)

**Email 3 (7 days later, if inactive):** "Your stack is waiting"
- Re-engagement nudge
- CTA: "Discover more tools →"

### Implementation
Add a scheduled job that runs every 6 hours and checks `email_stacks` for reminders due:
```python
await db.email_stacks.find({
    "status": "pending",
    "reminder_due_at": {"$lte": datetime.utcnow()}
})
```

---

## Phase 5: Marketplace Email Polish (Week 3)

### Current Marketplace Emails
The existing `send_purchase_confirmation`, `send_setup_request_notification`, and `send_payout_notification` use basic inline styles. They don't feel like GitStack.

### Upgrade All to Neo-Brutalist

**Purchase Confirmation:**
- Header: GitStack logo + "Purchase Confirmed"
- Product card: screenshot, title, price, seller name
- Big CTA: "Download Now →"
- Secondary: "Leave a review →"
- Footer: "Questions? Reply to this email."

**Setup Request Notification (to seller):**
- Header: "New Setup Request"
- Product card + buyer note
- CTA: "Manage in Seller Dashboard →"
- Urgency badge if request is >24h old

**Setup Complete (to buyer):**
- Header: "Your setup is ready 🎉"
- Completion summary
- CTA: "Download + docs →"
- "Need help? Reply or book a follow-up."

**Payout Notification:**
- Header: "Payout Initiated"
- Amount, method, expected date
- CTA: "View Wallet →"

**New: Review Received (to seller):**
- "You got a new review on {product}"
- Star rating + review text
- CTA: "View on product page →"

**New: Product Approved/Rejected (to seller):**
- Status update on their listing
- If rejected: reason + "Edit and resubmit →"

---

## Phase 6: Onboarding Drip (Week 4)

### Now Possible Because Clerk Auth Exists

When a user signs up via Clerk, trigger a 5-email onboarding series:

**Email 1 — "Welcome, {first_name}" (immediate)**
- Subject: "Let's build something"
- Hook: "You don't need to code. You need the right tools."
- CTA: "Pick what you're building →" (category selection)

**Email 2 — "Your First Daily Drop" (next day, 9 AM)**
- First Daily Drop email
- Educational: "Each tool replaces a $$$ SaaS"
- CTA: "Find alternatives to YOUR tools →" (`/dead-tool-detector`)

**Email 3 — "Stack Generator Deep Dive" (day 3)**
- Subject: "Build your entire stack from one sentence"
- Example: "Newsletter with paid subscriptions"
- Result: Ghost + Stripe + Mailgun
- CTA: "Generate YOUR stack →"

**Email 4 — "Repo Translator + Roast My Stack" (day 5)**
- Feature intros with CTAs
- Social proof: "4,300+ tools indexed"

**Email 5 — "The Marketplace" (day 7)**
- Subject: "Buy code that works"
- Showcase 3 featured products
- CTA: "Browse the marketplace →"

### Trigger
Hook into Clerk's `user.created` webhook or check for new `users` collection entries in the daily job.

---

## Phase 7: Smart Triggers (Week 5+)

### Event-Driven Emails

| Event | Email | Delay |
|---|---|---|
| User visits `/alternatives/{tool}` | "We found 2 MORE alternatives to {paid_tool}" | 2 hours |
| Repo in user's viewed topic +500 stars | "🔥 {tool} is blowing up" | Immediate |
| User saves 5th stack | "You're officially a Stack Architect" | Immediate |
| User views 10+ tools | "You've explored 10 tools. You know more than most developers." | Next daily drop |
| Purchase + 7 days | "How's {product} working for you? Leave a review →" | 7 days |
| Setup request created + 24h (seller) | "Reminder: Setup request waiting" | 24 hours |
| User inactive 14 days | "Your competitors aren't sleeping" | 14 days |

### Requirements
- Log user activity server-side (currently `localStorage`-only for many actions)
- Add `user_activity` collection:
  ```json
  {
    "user_id": "clerk_user_id",
    "action": "viewed_tool|saved_stack|visited_alternatives",
    "target_id": "tool_id_or_stack_id",
    "timestamp": "2026-05-10T09:00:00Z"
  }
  ```

---

## Phase 8: Deliverability & Compliance

### Domain Setup (Critical)
Without this, emails go to spam.

1. **SPF record:**
   ```
   gitstack.dev TXT "v=spf1 include:_spf.resend.com ~all"
   ```
   (Or your SMTP provider's SPF record)

2. **DKIM:** Provided by your email service

3. **DMARC:**
   ```
   _dmarc.gitstack.dev TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@gitstack.dev"
   ```

4. **Custom return-path:** Your email provider handles this

5. **Test before sending:**
   - [Mail Tester](https://www.mail-tester.com)
   - Gmail, Outlook, Apple Mail real accounts
   - Dark mode compatibility check

### Compliance

| Requirement | Implementation |
|---|---|
| **CAN-SPAM** | Physical address in footer, clear "From" name, working unsubscribe |
| **GDPR** | Explicit opt-in, one-click unsubscribe, data deletion on request |
| **Bounce handling** | Webhook from email provider → set `status: "bounced"` |
| **Complaint handling** | Webhook → immediate unsubscribe |
| **Unsubscribe** | One click, no login, immediate, confirmed on screen |

### Reply Handling
Set `reply_to` to `hello@gitstack.pro` or `bedaantsrivastav2001@gmail.com`. Founders replying to emails builds trust.

---

## Phase 9: Files to Create / Modify

### New Files
```
backend/
  email_jobs.py              # Daily drop, stack reminders, onboarding drip
  templates/
    daily_drop.html          # Single template file (Jinja2 when we scale)
    welcome.html
    stack_reminder.html
    
frontend/src/pages/
  UnsubscribePage.js         # Branded unsubscribe confirmation
  PreferencesPage.js         # Token-based preference management
```

### Modified Files
```
backend/
  utils/email.py             # Add neo-brutalist templates, daily drop send, token utils
  server.py                  # Add preference endpoints, webhook handlers, activity logging
  requirements.txt           # Add APScheduler (if using in-process scheduler)

frontend/
  src/App.js                 # Add /unsubscribe and /preferences routes
  src/components/Footer.js   # Add "Email Preferences" link
  src/components/sections/NewsletterSignup.js  # Add compliance checkbox
  src/components/ui/NewsletterPopup.js         # Add preference link

root/
  render.yaml                # Add cron job for daily drop
```

---

## Phase 10: Dependencies

**New dependencies:**
```
APScheduler==3.10.4        # If using in-process scheduling (Render Cron preferred)
jinja2==3.1.4              # When we have 5+ templates (Week 3-4)
premailer==3.10.0          # Inline CSS for email compatibility (optional)
```

**Existing dependencies we leverage:**
- `fastapi_mail` → Already in `utils/email.py`
- `httpx` → API calls
- `pydantic` → Validation
- `motor` → MongoDB

---

## Phase 11: Success Metrics

| Metric | Month 1 | Month 3 | Why |
|---|---|---|---|
| Welcome email delivery | 100% of new subs | — | Close broken loop |
| Stack email delivery | 100% of new saves | — | Keep the promise |
| Daily Drop open rate | >25% | >35% | Cold list starting point |
| Daily Drop click rate | >5% | >10% | One strong CTA |
| Unsubscribe rate | <1% | <0.5% | Quality over quantity |
| Bounce rate | <2% | <1% | List hygiene |
| Onboarding email #1 open | >50% | >60% | Welcome emails perform well |
| Marketplace purchase email open | >60% | >70% | Transactional = high engagement |
| Spam complaint rate | <0.1% | <0.05% | Compliance |

### The North Star
> "Every founder who gives us their email actually receives value from it."

---

## What Changed From the First Draft

| First Draft (Based on Old Local Copy) | This Draft (Based on Real Codebase) |
|---|---|
| Auth disabled, user always `null` | ✅ Clerk auth integrated, real users |
| `utils/email.py` missing | ✅ Exists with `fastapi_mail` + SMTP |
| Marketplace not built | ✅ Fully built: discovery, product, sell, checkout, Razorpay |
| Proposed Resend API | Keep SMTP (via `fastapi_mail`), just upgrade credentials |
| 7-email onboarding not possible | ✅ Now possible with Clerk webhooks |
| Proposed complex `founder_score` | Use existing `repo_of_the_day` + `github_repos.score` |
| Assumed no user activity tracking | Add `user_activity` collection for triggers |
| Proposed MongoDB template storage | Keep simple templates, upgrade to Jinja2 later |
| Proposed new `email_preferences` collection | Enhance existing `newsletter_subscribers` instead |

The new plan respects the actual architecture and builds on top of working code rather than replacing it.
