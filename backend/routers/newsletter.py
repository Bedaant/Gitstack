from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any
import asyncio
from datetime import datetime, timezone
from utils.email import send_welcome_email, send_preferences_link
import server

router = APIRouter(tags=["Newsletter"])

class NewsletterSubscribeRequest(BaseModel):
    email: str
    source: Optional[str] = None

class PreferencesLinkRequest(BaseModel):
    email: str

class PreferencesUpdateRequest(BaseModel):
    token: str
    preferences: Dict[str, Any]


@router.post("/newsletter/subscribe")
@server.limiter.limit("5/minute")
async def subscribe_newsletter(request: Request, req: NewsletterSubscribeRequest):
    """Subscribe to the GitStack daily digest"""
    email = req.email.lower().strip()

    if not server._EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Invalid email address")

    existing = await server.db.newsletter_subscribers.find_one({"email": email})
    if existing:
        return {"message": "Already subscribed", "status": "existing"}

    await server.db.newsletter_subscribers.insert_one({
        "email": email,
        "source": req.source,
        "subscribed_at": datetime.now(timezone.utc).isoformat(),
        "status": "active"
    })

    asyncio.create_task(_safe_send_welcome(email))

    return {"message": "Successfully subscribed to GitStack daily digest!", "status": "new"}


async def _safe_send_welcome(email: str):
    try:
        await send_welcome_email(email)
    except Exception as e:
        server.logger.warning(f"Failed to send welcome email to {email}: {e}")


@router.post("/newsletter/preferences-link")
@server.limiter.limit("10/minute")
async def api_send_preferences_link(request: Request, req: PreferencesLinkRequest):
    """Send a magic link to manage email preferences."""
    email = req.email.lower().strip()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Valid email required")

    token = server._generate_email_token(email)

    try:
        await send_preferences_link(email, token)
        return {"message": "Preferences link sent. Check your inbox."}
    except Exception as e:
        server.logger.error(f"Failed to send preferences link to {email}: {e}")
        raise HTTPException(status_code=500, detail="Could not send email. Try again.")


@router.get("/newsletter/preferences")
async def get_preferences(token: str):
    """Get current email preferences using a token."""
    email = server._verify_email_token(token)
    subscriber = await server.db.newsletter_subscribers.find_one({"email": email})
    if not subscriber:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    return {
        "email": email,
        "status": subscriber.get("status", "active"),
        "preferences": subscriber.get("preferences", {
            "daily_drop": True,
            "stack_reminders": True,
            "product_updates": False,
        }),
    }


@router.put("/newsletter/preferences")
async def update_preferences(req: PreferencesUpdateRequest):
    """Update email preferences using a token."""
    email = server._verify_email_token(req.token)
    prefs = req.preferences

    allowed_keys = {"daily_drop", "stack_reminders", "product_updates"}
    cleaned = {k: bool(v) for k, v in prefs.items() if k in allowed_keys}

    result = await server.db.newsletter_subscribers.update_one(
        {"email": email},
        {"$set": {"preferences": cleaned, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    return {"message": "Preferences updated", "preferences": cleaned}


@router.post("/newsletter/unsubscribe")
@server.limiter.limit("30/minute")
async def unsubscribe_post(request: Request, token: str):
    """Unsubscribe using a token (POST to prevent CSRF via embedded images)."""
    email = server._verify_email_token(token)
    result = await server.db.newsletter_subscribers.update_one(
        {"email": email},
        {"$set": {
            "status": "unsubscribed",
            "unsubscribed_at": datetime.now(timezone.utc).isoformat(),
        }}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Subscriber not found")

    return {"message": "Unsubscribed successfully", "email": email}


@router.get("/newsletter/unsubscribe")
@server.limiter.limit("30/minute")
async def unsubscribe_get(request: Request, token: str):
    """GET handler for email links — validates token and returns confirmation prompt.
    The frontend should show a 'Confirm Unsubscribe' button that POSTs."""
    email = server._verify_email_token(token)
    return {"email": email, "action": "confirm", "message": "Click confirm to unsubscribe."}


@router.get("/newsletter/count")
async def get_newsletter_count():
    """Get subscriber count for social proof"""
    count = await server.db.newsletter_subscribers.count_documents({"status": "active"})
    return {"count": count}
