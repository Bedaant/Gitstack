# Pro Tier Backup — Removed on 2026-05-17

This file contains all code that was removed to disable the Pro subscription tier.
To re-enable, reverse the removals below.

---

## 1. Backend — `server.py`

### 1.1 UserModel fields (keep these in place — harmless if unused)

These fields were added to `UserModel` and should stay in your models. They default to `"free"` and `None`.

```python
class UserModel(BaseModel):
    # ... existing fields ...
    subscription_tier: Literal["free", "pro"] = "free"
    subscription_expires_at: Optional[datetime] = None
```

### 1.2 `require_pro()` dependency (REMOVED)

Add this back near `require_admin()`:

```python
def _is_pro_active(user: UserModel) -> bool:
    if user.subscription_tier != "pro":
        return False
    if user.subscription_expires_at and user.subscription_expires_at < datetime.now(timezone.utc):
        return False
    return True

async def require_pro(request: Request) -> UserModel:
    user = await require_auth(request)
    if not _is_pro_active(user):
        raise HTTPException(status_code=403, detail="Pro subscription required")
    return user
```

### 1.3 Request models (REMOVED)

Add back near other request models:

```python
class SubscriptionVerifyRequest(BaseModel):
    razorpay_subscription_id: str
    razorpay_payment_id: str
    razorpay_signature: str
```

### 1.4 Subscription endpoints (REMOVED)

Add these back near the other Razorpay endpoints:

```python
@api_router.post("/subscriptions/create")
async def create_subscription(request: Request):
    user = await require_auth(request)
    plan_id = os.environ.get("RAZORPAY_SUBSCRIPTION_PLAN_ID")
    if not plan_id:
        raise HTTPException(status_code=500, detail="Subscriptions not configured")
    rzp = get_razorpay_client()
    try:
        sub = rzp.subscription.create({
            "plan_id": plan_id,
            "customer_notify": 1,
            "total_count": 12,
            "notes": {"user_id": user.user_id, "email": user.email},
        })
        return {"subscription_id": sub["id"], "status": sub["status"]}
    except Exception as e:
        logger.error(f"Razorpay subscription create error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create subscription")

@api_router.post("/subscriptions/verify")
async def verify_subscription(data: SubscriptionVerifyRequest, request: Request):
    user = await require_auth(request)
    if not verify_razorpay_signature(data.razorpay_subscription_id, data.razorpay_payment_id, data.razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature")
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"subscription_tier": "pro", "subscription_expires_at": expires_at.isoformat()}}
    )
    return {"ok": True, "tier": "pro", "expires_at": expires_at.isoformat()}

@api_router.get("/subscriptions/me")
async def get_my_subscription(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    is_pro = _is_pro_active(user)
    return {
        "tier": "pro" if is_pro else "free",
        "expires_at": user.subscription_expires_at.isoformat() if user.subscription_expires_at else None,
    }

@api_router.post("/subscriptions/webhook/razorpay")
async def razorpay_subscription_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("x-razorpay-signature", "")
    if not verify_razorpay_webhook_signature(body, sig):
        raise HTTPException(status_code=400, detail="Invalid signature")
    try:
        event = json.loads(body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")
    event_name = event.get("event", "")
    payload = event.get("payload", {}).get("subscription", {}).get("entity", {})
    sub_id = payload.get("id")
    notes = payload.get("notes", {})
    user_id = notes.get("user_id")
    if event_name == "subscription.charged" and user_id:
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"subscription_tier": "pro", "subscription_expires_at": expires_at.isoformat()}}
        )
    elif event_name == "subscription.cancelled" and user_id:
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"subscription_tier": "free", "subscription_expires_at": None}}
        )
    return {"ok": True}
```

### 1.5 Pro-enhanced Master Prompt (REMOVED from `/ai/stack-master-prompt`)

Inside `stack_master_prompt()`, add back the Pro detection and prompt addon:

```python
    user = await get_current_user(request)
    is_pro = _is_pro_active(user) if user else False
```

Then append this to the prompt before the TONE section:

```python
    pro_addon = ""
    if is_pro:
        pro_addon = """
7. PRO ONLY — CI/CD PIPELINE (`.github/workflows/deploy.yml`):
   - Generate a GitHub Actions workflow that lints, builds Docker images, and deploys to a VPS on every push to main.
8. PRO ONLY — MONITORING STACK:
   - Add Prometheus + Grafana containers to docker-compose.yml for real-time health dashboards.
   - Include basic alerting rules for high CPU / disk usage.
9. PRO ONLY — SECURITY HARDENING:
   - Generate a `security.md` checklist covering: fail2ban, automatic security updates, UFW firewall rules, and HTTPS enforcement.
"""
```

And change the return to:
```python
    return {"prompt": result.strip(), "tier": "pro" if is_pro else "free"}
```

---

## 2. Frontend

### 2.1 `frontend/src/pages/SubscribePage.js` (REMOVED ENTIRELY)

This file was deleted. To restore, recreate it from the original content (see git history or earlier in this conversation).

### 2.2 `frontend/src/components/Header.js` — Go Pro button (REMOVED)

Add back inside the `<div className="hidden md:flex items-center gap-4">`:

```jsx
<Link to="/subscribe" className="neo-btn px-4 py-2 bg-amber-500 text-white border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all text-sm font-black inline-flex items-center gap-1.5">
  <Crown className="w-4 h-4" /> Go Pro
</Link>
```

Also import `Crown` from `lucide-react`.

### 2.3 `frontend/src/pages/StackGenerator.js` — Pro upsell banner (REMOVED)

Add back inside the Stack tab, after "Here's your tailored stack:":

```jsx
<div className="neo-card p-4 bg-amber-50 border-amber-500 mb-6">
  <div className="flex items-start gap-3">
    <Crown className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
    <div>
      <p className="text-sm font-bold text-amber-900">
        Want CI/CD pipelines, monitoring, and security hardening?
      </p>
      <p className="text-xs text-amber-800 mt-1">
        Upgrade to <Link to="/subscribe" className="underline font-bold">GitStack Pro</Link> and get an enhanced Master Prompt with production-ready DevOps blueprints.
      </p>
    </div>
  </div>
</div>
```

Also import `Crown` from `lucide-react`.

### 2.4 `frontend/src/App.js` — Subscribe route (REMOVED)

Add back:

```js
import SubscribePage from "./pages/SubscribePage";
```

And in routes:

```jsx
<Route path="/subscribe" element={<SubscribePage />} />
```

---

## 3. Environment Variables

### 3.1 `backend/.env.example` (REMOVED lines)

Add back if you want Pro support:

```bash
# Razorpay Subscription Plan ID for Pro tier
RAZORPAY_SUBSCRIPTION_PLAN_ID=plan_xxx
```

---

## 4. How to Restore

1. Copy the backend snippets back into `server.py`
2. Restore `frontend/src/pages/SubscribePage.js`
3. Add back the Header button, StackGenerator banner, and App.js route
4. Set `RAZORPAY_SUBSCRIPTION_PLAN_ID` in your environment
5. Create a Razorpay subscription plan in your Razorpay dashboard
6. Add the plan ID to your `.env`
