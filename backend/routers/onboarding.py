from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from datetime import datetime, timezone
import server

router = APIRouter(tags=["Onboarding"])

@router.get("/onboarding/intent")
async def track_onboarding_intent(token: str, type: str):
    """Track what the user is here for: stack-builder, buyer, seller, or tool-hunter.
    
    Called from tracked links in the welcome email. Records intent and redirects
    to the appropriate page.
    """
    valid_types = ["stack-builder", "buyer", "seller", "tool-hunter"]
    if type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid type. Must be one of: {', '.join(valid_types)}")
    
    try:
        email = server._verify_email_token(token)
    except HTTPException:
        # Invalid/expired token — still redirect, just don't track
        redirect_map = {
            "stack-builder": f"{server.FRONTEND_URL}/stack-generator",
            "buyer": f"{server.FRONTEND_URL}/marketplace",
            "seller": f"{server.FRONTEND_URL}/marketplace/sell",
            "tool-hunter": f"{server.FRONTEND_URL}/repo-of-the-day",
        }
        return RedirectResponse(url=redirect_map[type])
    
    # Record intent in user profile
    await server.db.users.update_one(
        {"email": email.lower().strip()},
        {
            "$set": {
                "onboarding_intent": type,
                "onboarding_intent_set_at": datetime.now(timezone.utc),
            }
        },
    )
    
    # Also record in newsletter subscribers if present
    await server.db.newsletter_subscribers.update_one(
        {"email": email.lower().strip()},
        {
            "$set": {
                "onboarding_intent": type,
                "onboarding_intent_set_at": datetime.now(timezone.utc),
            }
        },
    )
    
    redirect_map = {
        "stack-builder": f"{server.FRONTEND_URL}/stack-generator",
        "buyer": f"{server.FRONTEND_URL}/marketplace",
        "seller": f"{server.FRONTEND_URL}/marketplace/sell",
        "tool-hunter": f"{server.FRONTEND_URL}/repo-of-the-day",
    }
    return RedirectResponse(url=redirect_map[type])


@router.post("/onboarding/track-intent")
async def track_onboarding_intent_from_frontend(request: Request):
    """Track onboarding intent from the frontend (Clerk-authenticated).
    
    This is a fallback for users who don't click the tracked links in the
    welcome email. The frontend detects the first meaningful page visit and
    reports it here.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = auth_header.split(" ")[1]
    if not server._jwks_client:
        raise HTTPException(status_code=503, detail="Auth not configured")
    
    try:
        body = await request.json()
        intent_type = body.get("type")
        valid_types = ["stack-builder", "buyer", "seller", "tool-hunter"]
        if intent_type not in valid_types:
            raise HTTPException(status_code=400, detail=f"Invalid type. Must be one of: {', '.join(valid_types)}")
        
        signing_key = server._jwks_client.get_signing_key_from_jwt(token)
        payload = server.jwt.decode(token, signing_key.key, algorithms=["RS256"], options={"verify_aud": False})
        clerk_user_id = payload.get("sub")
        if not clerk_user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Only set if not already set (email link takes precedence)
        result = await server.db.users.update_one(
            {"user_id": clerk_user_id, "onboarding_intent": {"$exists": False}},
            {
                "$set": {
                    "onboarding_intent": intent_type,
                    "onboarding_intent_set_at": datetime.now(timezone.utc),
                    "onboarding_intent_source": "frontend",
                }
            },
        )
        
        return {
            "success": True,
            "intent": intent_type,
            "updated": result.modified_count > 0,
        }
    except HTTPException:
        raise
    except Exception as e:
        server.logger.warning(f"Onboarding intent error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")
