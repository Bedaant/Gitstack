# Phase 3 — Marketplace Backend

> **Read `plan.md` first** for full codebase context before implementing anything here.

## Goal

Add all backend API endpoints, MongoDB collections, and Stripe/R2 integrations needed to run a software marketplace inside Gitstack. Sellers upload ZIP files to Cloudflare R2; buyers pay via Stripe Connect; after a confirmed payment the buyer receives a signed R2 download URL.

## Prerequisites

- **Phase 0 (auth) must be complete.** All marketplace endpoints rely on `get_current_user()`.

## Status

- [ ] Task 1 — Add new Python dependencies to requirements.txt
- [ ] Task 2 — Add new env var declarations to render.yaml
- [ ] Task 3 — Add Pydantic models for marketplace
- [ ] Task 4 — Add Cloudflare R2 helper functions
- [ ] Task 5 — Add Stripe helper functions
- [ ] Task 6 — Implement seller onboarding endpoint
- [ ] Task 7 — Implement product CRUD endpoints
- [ ] Task 8 — Implement ZIP upload endpoint
- [ ] Task 9 — Implement checkout and webhook endpoints
- [ ] Task 10 — Implement purchase history and download endpoints
- [ ] Task 11 — Implement public seller profile endpoint

---

## New Environment Variables

Add these to `render.yaml` under the `gitstack-api` service `envVars` block:

```yaml
- key: STRIPE_SECRET_KEY
  sync: false
- key: STRIPE_WEBHOOK_SECRET
  sync: false
- key: STRIPE_PLATFORM_FEE_PERCENT
  value: "15"
- key: R2_ACCOUNT_ID
  sync: false
- key: R2_ACCESS_KEY_ID
  sync: false
- key: R2_SECRET_ACCESS_KEY
  sync: false
- key: R2_BUCKET_NAME
  value: gitstack-marketplace
- key: FRONTEND_URL
  sync: false  # set to https://gitstack.pro
```

---

## Task 1 — Add dependencies

**File:** `backend/requirements.txt`

Append:
```
stripe
boto3
```

---

## Task 2 — Add env var declarations to render.yaml

See env vars listed above. Add them under the `gitstack-api` service `envVars` list in `render.yaml`.

---

## Task 3 — Add Pydantic models

**File:** `backend/server.py`

Add these Pydantic models near the top of the file alongside the existing models:

```python
class MarketplaceProductCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    tagline: str = Field(..., min_length=10, max_length=200)
    description: str = Field(..., min_length=50, max_length=5000)
    price_cents: int = Field(..., ge=100, le=100000)  # $1 min, $1000 max
    category: str = Field(..., pattern="^(saas|mcp-server|computer-vision|template|skill|other)$")
    github_repo_url: Optional[str] = Field(None, max_length=200)

class MarketplaceProductResponse(BaseModel):
    product_id: str
    seller_user_id: str
    title: str
    tagline: str
    description: str
    price_cents: int
    category: str
    screenshots: List[str]  # R2 public URLs for preview images
    github_repo_url: Optional[str] = None
    purchase_count: int = 0
    created_at: str
    seller_name: Optional[str] = None  # joined from users collection

class CheckoutRequest(BaseModel):
    product_id: str = Field(..., min_length=1, max_length=100)

class SellerOnboardRequest(BaseModel):
    display_name: str = Field(..., min_length=2, max_length=100)
    bio: str = Field(default="", max_length=500)
```

---

## Task 4 — Add Cloudflare R2 helper functions

**File:** `backend/server.py`

Add near the top of the file after imports. Cloudflare R2 uses the AWS S3-compatible API.

```python
import boto3
from botocore.config import Config as BotoConfig
import os
import uuid

def get_r2_client():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        config=BotoConfig(signature_version="s3v4"),
        region_name="auto",
    )

async def upload_to_r2(file_bytes: bytes, original_filename: str, folder: str = "uploads") -> str:
    """Upload bytes to R2, return the R2 object key."""
    ext = original_filename.rsplit(".", 1)[-1] if "." in original_filename else "bin"
    key = f"{folder}/{uuid.uuid4()}.{ext}"
    client = get_r2_client()
    client.put_object(
        Bucket=os.environ["R2_BUCKET_NAME"],
        Key=key,
        Body=file_bytes,
        ContentType="application/octet-stream",
    )
    return key

def get_r2_signed_url(key: str, expiry_seconds: int = 3600) -> str:
    """Generate a pre-signed download URL valid for expiry_seconds."""
    client = get_r2_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": os.environ["R2_BUCKET_NAME"], "Key": key},
        ExpiresIn=expiry_seconds,
    )
```

---

## Task 5 — Add Stripe helper functions

**File:** `backend/server.py`

```python
import stripe as stripe_lib

def get_stripe():
    stripe_lib.api_key = os.environ["STRIPE_SECRET_KEY"]
    return stripe_lib
```

---

## Task 6 — Seller onboarding endpoint

Add these two endpoints to `backend/server.py`:

```python
@app.post("/api/marketplace/seller/onboard")
async def seller_onboard(data: SellerOnboardRequest, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    existing = await db.marketplace_sellers.find_one({"seller_user_id": user.user_id})
    if existing and existing.get("stripe_account_id"):
        # Already onboarded — generate a new account link to complete/update
        s = get_stripe()
        link = s.AccountLink.create(
            account=existing["stripe_account_id"],
            refresh_url=f"{os.environ['FRONTEND_URL']}/sell",
            return_url=f"{os.environ['FRONTEND_URL']}/sell?onboarded=1",
            type="account_onboarding",
        )
        return {"url": link.url}

    # Create Stripe Connect Express account
    s = get_stripe()
    account = s.Account.create(type="express")

    await db.marketplace_sellers.update_one(
        {"seller_user_id": user.user_id},
        {"$set": {
            "seller_user_id": user.user_id,
            "stripe_account_id": account.id,
            "display_name": data.display_name,
            "bio": data.bio,
            "onboarded_at": None,  # set to datetime when onboarding completes
        }},
        upsert=True,
    )

    link = s.AccountLink.create(
        account=account.id,
        refresh_url=f"{os.environ['FRONTEND_URL']}/sell",
        return_url=f"{os.environ['FRONTEND_URL']}/sell?onboarded=1",
        type="account_onboarding",
    )
    return {"url": link.url}

@app.get("/api/marketplace/seller/{seller_id}")
async def get_seller_profile(seller_id: str):
    seller = await db.marketplace_sellers.find_one({"seller_user_id": seller_id}, {"_id": 0, "stripe_account_id": 0})
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    user = await db.users.find_one({"user_id": seller_id}, {"_id": 0, "email": 0})
    products = await db.marketplace_products.find(
        {"seller_user_id": seller_id}, {"_id": 0, "description": 0}
    ).to_list(50)
    return {"seller": {**seller, "name": user.get("name"), "picture": user.get("picture")}, "products": products}
```

---

## Task 7 — Product CRUD endpoints

```python
import uuid as uuid_lib
from datetime import datetime, timezone

@app.post("/api/marketplace/products")
async def create_product(data: MarketplaceProductCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    # Verify seller is onboarded
    seller = await db.marketplace_sellers.find_one({"seller_user_id": user.user_id})
    if not seller:
        raise HTTPException(status_code=403, detail="Complete seller onboarding first")

    product_id = str(uuid_lib.uuid4())
    doc = {
        "product_id": product_id,
        "seller_user_id": user.user_id,
        "title": data.title,
        "tagline": data.tagline,
        "description": data.description,
        "price_cents": data.price_cents,
        "category": data.category,
        "github_repo_url": data.github_repo_url,
        "screenshots": [],
        "r2_file_key": None,  # set after upload
        "purchase_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.marketplace_products.insert_one(doc)
    doc.pop("_id", None)
    return doc

@app.get("/api/marketplace/products")
async def list_products(
    q: Optional[str] = None,
    category: Optional[str] = None,
    sort: str = "newest",
    page: int = 1,
    limit: int = 20,
):
    limit = min(limit, 50)
    query: dict = {"r2_file_key": {"$ne": None}}  # only show published products
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"tagline": {"$regex": q, "$options": "i"}},
        ]
    if category:
        query["category"] = category

    sort_field = {"newest": ("created_at", -1), "best_sellers": ("purchase_count", -1),
                  "price_asc": ("price_cents", 1), "price_desc": ("price_cents", -1)}.get(sort, ("created_at", -1))

    cursor = db.marketplace_products.find(query, {"_id": 0, "description": 0, "r2_file_key": 0}).sort(*sort_field).skip((page - 1) * limit).limit(limit)
    products = await cursor.to_list(limit)
    # Attach seller names
    for p in products:
        seller = await db.marketplace_sellers.find_one({"seller_user_id": p["seller_user_id"]}, {"_id": 0, "display_name": 1})
        p["seller_name"] = seller.get("display_name") if seller else None
    return {"products": products, "page": page}

@app.get("/api/marketplace/products/{product_id}")
async def get_product(product_id: str):
    product = await db.marketplace_products.find_one({"product_id": product_id}, {"_id": 0, "r2_file_key": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    seller = await db.marketplace_sellers.find_one({"seller_user_id": product["seller_user_id"]}, {"_id": 0, "stripe_account_id": 0})
    user = await db.users.find_one({"user_id": product["seller_user_id"]}, {"_id": 0, "email": 0})
    product["seller"] = {**(seller or {}), "name": (user or {}).get("name"), "picture": (user or {}).get("picture")}
    return product

@app.patch("/api/marketplace/products/{product_id}")
async def update_product(product_id: str, data: dict, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    product = await db.marketplace_products.find_one({"product_id": product_id})
    if not product or product["seller_user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    allowed = {"title", "tagline", "description", "price_cents", "category", "github_repo_url"}
    update = {k: v for k, v in data.items() if k in allowed}
    if not update:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    await db.marketplace_products.update_one({"product_id": product_id}, {"$set": update})
    return {"ok": True}

@app.delete("/api/marketplace/products/{product_id}")
async def delete_product(product_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    product = await db.marketplace_products.find_one({"product_id": product_id})
    if not product or product["seller_user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.marketplace_products.delete_one({"product_id": product_id})
    return {"ok": True}
```

---

## Task 8 — ZIP upload endpoint

```python
from fastapi import UploadFile, File

@app.post("/api/marketplace/products/{product_id}/upload")
async def upload_product_zip(product_id: str, file: UploadFile = File(...), request: Request = None):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    product = await db.marketplace_products.find_one({"product_id": product_id})
    if not product or product["seller_user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only ZIP files are accepted")
    if file.size and file.size > 500 * 1024 * 1024:  # 500 MB limit
        raise HTTPException(status_code=400, detail="File too large (max 500 MB)")

    content = await file.read()
    key = await upload_to_r2(content, file.filename, folder=f"products/{product_id}")
    await db.marketplace_products.update_one({"product_id": product_id}, {"$set": {"r2_file_key": key}})
    return {"ok": True, "key": key}
```

---

## Task 9 — Checkout and Stripe webhook

```python
@app.post("/api/marketplace/checkout")
async def create_checkout(data: CheckoutRequest, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    product = await db.marketplace_products.find_one({"product_id": data.product_id})
    if not product or not product.get("r2_file_key"):
        raise HTTPException(status_code=404, detail="Product not available")

    seller = await db.marketplace_sellers.find_one({"seller_user_id": product["seller_user_id"]})
    if not seller or not seller.get("stripe_account_id"):
        raise HTTPException(status_code=400, detail="Seller payment not configured")

    platform_fee_pct = int(os.environ.get("STRIPE_PLATFORM_FEE_PERCENT", "15"))
    application_fee = int(product["price_cents"] * platform_fee_pct / 100)

    s = get_stripe()
    session = s.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": "usd",
                "product_data": {"name": product["title"]},
                "unit_amount": product["price_cents"],
            },
            "quantity": 1,
        }],
        mode="payment",
        success_url=f"{os.environ['FRONTEND_URL']}/marketplace/{data.product_id}?purchased=1",
        cancel_url=f"{os.environ['FRONTEND_URL']}/marketplace/{data.product_id}",
        payment_intent_data={
            "application_fee_amount": application_fee,
            "transfer_data": {"destination": seller["stripe_account_id"]},
        },
        metadata={
            "product_id": data.product_id,
            "buyer_user_id": user.user_id,
        },
    )

    # Create pending purchase record
    purchase_id = str(uuid_lib.uuid4())
    await db.marketplace_purchases.insert_one({
        "purchase_id": purchase_id,
        "buyer_user_id": user.user_id,
        "product_id": data.product_id,
        "stripe_session_id": session.id,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"checkout_url": session.url}

@app.post("/api/marketplace/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    s = get_stripe()
    try:
        event = s.Webhook.construct_event(payload, sig_header, os.environ["STRIPE_WEBHOOK_SECRET"])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        stripe_session_id = session["id"]
        await db.marketplace_purchases.update_one(
            {"stripe_session_id": stripe_session_id},
            {"$set": {"status": "completed"}},
        )
        # Increment purchase count on product
        product_id = session["metadata"].get("product_id")
        if product_id:
            await db.marketplace_products.update_one(
                {"product_id": product_id}, {"$inc": {"purchase_count": 1}}
            )

    return {"ok": True}
```

---

## Task 10 — Purchase history and download

```python
@app.get("/api/marketplace/purchases")
async def get_purchases(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    purchases = await db.marketplace_purchases.find(
        {"buyer_user_id": user.user_id, "status": "completed"},
        {"_id": 0, "stripe_session_id": 0},
    ).sort("created_at", -1).to_list(100)
    return {"purchases": purchases}

@app.get("/api/marketplace/download/{purchase_id}")
async def download_product(purchase_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    purchase = await db.marketplace_purchases.find_one(
        {"purchase_id": purchase_id, "buyer_user_id": user.user_id, "status": "completed"}
    )
    if not purchase:
        raise HTTPException(status_code=403, detail="No completed purchase found")

    product = await db.marketplace_products.find_one({"product_id": purchase["product_id"]})
    if not product or not product.get("r2_file_key"):
        raise HTTPException(status_code=404, detail="File not found")

    signed_url = get_r2_signed_url(product["r2_file_key"], expiry_seconds=300)  # 5 min
    return {"download_url": signed_url}
```

---

## Task 11 — Public seller profile (see Task 6 above)

Already included in Task 6 as `GET /api/marketplace/seller/{seller_id}`.

---

## Verification

1. `POST /api/marketplace/seller/onboard` with auth → returns Stripe Connect onboarding URL.
2. `POST /api/marketplace/products` with auth + valid data → creates product in MongoDB.
3. `POST /api/marketplace/products/{id}/upload` with a real `.zip` file → R2 object key stored on product.
4. `GET /api/marketplace/products` → returns list of published products.
5. `GET /api/marketplace/products/{id}` → returns full product with seller details.
6. `POST /api/marketplace/checkout` → returns a real Stripe Checkout URL. Open it in browser, complete with test card `4242 4242 4242 4242`.
7. Stripe webhook fires → purchase status becomes `completed`.
8. `GET /api/marketplace/download/{purchase_id}` → returns a signed R2 URL. Visiting it downloads the ZIP.
