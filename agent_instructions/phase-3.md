# Phase 3 — Marketplace Backend

> **Read `plan.md` first** for full codebase context before implementing anything here.

## Vision Recap

GitStack Marketplace = **Gumroad + Fiverr + Developer Portfolio** for indie dev tools.

A seller uploads a GitHub-style project (e.g. an alternative to a $17/month SaaS), prices it as **a one-time purchase ($50)** with optional **setup service ($10)**. Buyers pay via **Razorpay** (Indian-friendly, works worldwide). Money flows into the seller's **GitStack Wallet** (85% to seller, 15% platform fee). Sellers can withdraw to **UPI / bank / PayPal**. Setup payments are held in **escrow** until the buyer confirms delivery (or 7-day auto-release). Buyers leave **1–5 star reviews** after purchase. Verified sellers earn a **✓ badge**.

This phase implements **only the backend** — Pydantic models, MongoDB collections, Razorpay integration, R2 storage, and all REST endpoints. Phase 4 builds the UI on top.

## Prerequisites

- **Phase 0 (auth) must be complete.** Every protected endpoint relies on `get_current_user()`.
- Razorpay account (test mode is fine to start — no KYC needed).
- Cloudflare R2 bucket created (separate from any existing one — call it `gitstack-marketplace`).

## End-to-End User Flows (reference for endpoint design)

### Buyer flow
1. Browse `/marketplace` → search / filter / sort.
2. Open a product → see screenshots, demo video, markdown description, AI repo summary, reviews, seller card with verified badge.
3. Choose **Buy Source ($50)** OR **Buy Source + Setup ($60)**. Click "Open in Repo Translator" if curious.
4. Not logged in → Clerk modal → resume.
5. Backend creates a Razorpay **order** → frontend opens Razorpay Checkout.
6. Buyer pays → frontend hits `/verify-payment` → backend validates signature → marks purchase **completed**, credits seller wallet (and escrow if setup was bought).
7. Buyer is redirected to product page with `?purchased=1` → "Download" button appears → 5-minute signed R2 URL.
8. After download, buyer can leave a **review** (1–5 stars + text).
9. If setup was bought, a **setup_request** is created (status: `pending`) — visible in `/dashboard` "My Purchases".

### Seller flow
1. `/sell` (auth-required) → Not onboarded → fill display_name, bio, payout method (UPI/bank/PayPal).
2. `marketplace_sellers` doc + `seller_wallets` doc auto-created. Wallet balance = $0.
3. Dashboard with three tabs: **My Listings**, **Setup Requests**, **Wallet & Payouts**.
4. Create product (5-step wizard) → starts as DRAFT → seller toggles LIVE when ready.
5. Receives setup request → marks `in_progress` → marks `completed` → buyer confirms (or 7-day auto-release) → escrow released to wallet balance.
6. Requests withdrawal → admin processes manually within 3 business days.

### Hiring flow (cross-references Phase 7)
- Sellers with `available_for_hire: true` show a **"Hire Me"** button on their `/u/:userId` profile (added in Phase 4 to the existing UserProfilePage).

---

## Status

- [ ] Task 1 — Add dependencies to `requirements.txt`
- [ ] Task 2 — Add env vars to `render.yaml` and `.env.example`
- [ ] Task 3 — Create MongoDB indexes on startup
- [ ] Task 4 — Add Pydantic models
- [ ] Task 5 — Add R2 helper functions (ZIP private + screenshot public)
- [ ] Task 6 — Add Razorpay helper functions
- [ ] Task 7 — Seller onboarding endpoint
- [ ] Task 8 — Product CRUD endpoints (with draft/published)
- [ ] Task 9 — Screenshot upload endpoint
- [ ] Task 10 — ZIP upload endpoint
- [ ] Task 11 — Publish toggle endpoint
- [ ] Task 12 — Razorpay create-order endpoint
- [ ] Task 13 — Razorpay verify-payment endpoint
- [ ] Task 14 — Razorpay webhook endpoint
- [ ] Task 15 — Buyer purchases + download endpoints
- [ ] Task 16 — Setup-request endpoints (seller status updates, buyer confirm)
- [ ] Task 17 — Auto-release escrow background task (7 days)
- [ ] Task 18 — Wallet endpoints (balance, transactions, withdrawal)
- [ ] Task 19 — Product reviews endpoints (create, list, aggregate)
- [ ] Task 20 — Seller dashboard aggregate endpoint
- [ ] Task 21 — Public seller-profile endpoint (with verified badge + hire flag)
- [ ] Task 22 — Cross-feature lookup: products-by-repo + tool/topic association

---

## Task 1 — Dependencies

**File:** `backend/requirements.txt`

Append:
```
razorpay
boto3
```

---

## Task 2 — Environment Variables

**File:** `render.yaml` (under `gitstack-api` service `envVars`)

```yaml
- key: RAZORPAY_KEY_ID
  sync: false
- key: RAZORPAY_KEY_SECRET
  sync: false
- key: RAZORPAY_WEBHOOK_SECRET
  sync: false
- key: PLATFORM_FEE_PERCENT
  value: "15"
- key: R2_ACCOUNT_ID
  sync: false
- key: R2_ACCESS_KEY_ID
  sync: false
- key: R2_SECRET_ACCESS_KEY
  sync: false
- key: R2_BUCKET_NAME
  value: gitstack-marketplace
- key: R2_PUBLIC_URL
  sync: false  # set to https://pub-xxxxx.r2.dev OR custom CDN domain
- key: FRONTEND_URL
  sync: false  # set to https://gitstack.pro
```

Mirror the same keys (with placeholder values) in `backend/.env.example`.

---

## Task 3 — MongoDB Indexes

In the existing startup block in `server.py` (where other indexes are created), add:

```python
try:
    await db.marketplace_products.create_index([("seller_user_id", 1)])
    await db.marketplace_products.create_index([("published", 1), ("created_at", -1)])
    await db.marketplace_products.create_index([("category", 1), ("published", 1)])
    await db.marketplace_purchases.create_index([("buyer_user_id", 1), ("status", 1)])
    await db.marketplace_purchases.create_index([("razorpay_order_id", 1)], unique=True, sparse=True)
    await db.setup_requests.create_index([("seller_user_id", 1), ("status", 1)])
    await db.setup_requests.create_index([("auto_release_at", 1)])  # for the cron worker
    await db.product_reviews.create_index([("product_id", 1), ("created_at", -1)])
    await db.product_reviews.create_index([("buyer_user_id", 1), ("product_id", 1)], unique=True)
    await db.seller_wallets.create_index([("seller_user_id", 1)], unique=True)
    await db.wallet_transactions.create_index([("seller_user_id", 1), ("created_at", -1)])
    logger.info("marketplace indexes created")
except Exception as e:
    logger.warning(f"marketplace index creation skipped: {e}")
```

---

## Task 4 — Pydantic Models

Add to `backend/server.py` near the existing models block.

```python
from typing import Literal

# ---------- Products ----------

class MarketplaceProductCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    tagline: str = Field(..., min_length=10, max_length=200)
    description: str = Field(..., min_length=50, max_length=5000)
    source_price_cents: int = Field(..., ge=100, le=100000)  # $1 – $1000
    category: Literal["saas", "mcp-server", "computer-vision", "template", "skill", "other"]
    github_repo_url: Optional[str] = Field(None, max_length=200)
    demo_video_url: Optional[str] = Field(None, max_length=300)  # YouTube / Loom URL
    setup_available: bool = False
    setup_price_cents: Optional[int] = Field(None, ge=100, le=100000)
    setup_description: Optional[str] = Field(None, max_length=1000)
    setup_delivery_days: Optional[int] = Field(None, ge=1, le=30)

class MarketplaceProductUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=100)
    tagline: Optional[str] = Field(None, min_length=10, max_length=200)
    description: Optional[str] = Field(None, min_length=50, max_length=5000)
    source_price_cents: Optional[int] = Field(None, ge=100, le=100000)
    category: Optional[Literal["saas", "mcp-server", "computer-vision", "template", "skill", "other"]] = None
    github_repo_url: Optional[str] = Field(None, max_length=200)
    demo_video_url: Optional[str] = Field(None, max_length=300)
    setup_available: Optional[bool] = None
    setup_price_cents: Optional[int] = Field(None, ge=100, le=100000)
    setup_description: Optional[str] = Field(None, max_length=1000)
    setup_delivery_days: Optional[int] = Field(None, ge=1, le=30)

# ---------- Seller / Wallet ----------

class SellerOnboardRequest(BaseModel):
    display_name: str = Field(..., min_length=2, max_length=100)
    bio: str = Field(default="", max_length=500)
    payout_method: Literal["upi", "bank", "paypal"]
    payout_details: dict  # { upi_id } or { account_number, ifsc, name } or { paypal_email }
    available_for_hire: bool = False
    hire_contact: Optional[str] = Field(None, max_length=200)  # email / calendly URL

class WithdrawalRequest(BaseModel):
    amount_cents: int = Field(..., ge=1000)  # min $10

# ---------- Checkout ----------

class CreateOrderRequest(BaseModel):
    product_id: str
    purchase_type: Literal["source", "source_and_setup"]

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

# ---------- Setup ----------

class SetupStatusUpdate(BaseModel):
    status: Literal["in_progress", "completed"]
    note: Optional[str] = Field(None, max_length=500)

# ---------- Reviews ----------

class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    text: str = Field(..., min_length=1, max_length=500)
```

---

## Task 5 — Cloudflare R2 Helpers

Add near top of `server.py` after imports.

```python
import boto3
from botocore.config import Config as BotoConfig
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

async def upload_private_to_r2(file_bytes: bytes, original_filename: str, folder: str) -> str:
    """Upload a private file (e.g. ZIP source). Return the R2 object key.
    These are NOT publicly accessible — buyers must request a signed URL."""
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

async def upload_public_image_to_r2(file_bytes: bytes, original_filename: str, folder: str) -> str:
    """Upload a public image (e.g. screenshot). Return the public URL.
    Bucket must have a public access policy on the `public/` prefix configured in Cloudflare."""
    ext = (original_filename.rsplit(".", 1)[-1] or "png").lower()
    if ext not in {"jpg", "jpeg", "png", "webp", "gif"}:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, WebP, GIF images are allowed")
    key = f"public/{folder}/{uuid.uuid4()}.{ext}"
    content_type = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
                    "webp": "image/webp", "gif": "image/gif"}[ext]
    client = get_r2_client()
    client.put_object(
        Bucket=os.environ["R2_BUCKET_NAME"],
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
        CacheControl="public, max-age=31536000, immutable",
    )
    return f"{os.environ['R2_PUBLIC_URL'].rstrip('/')}/{key}"

def get_r2_signed_url(key: str, expiry_seconds: int = 300) -> str:
    """Generate a pre-signed download URL for a private object."""
    client = get_r2_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": os.environ["R2_BUCKET_NAME"], "Key": key},
        ExpiresIn=expiry_seconds,
    )
```

---

## Task 6 — Razorpay Helpers

```python
import razorpay
import hmac, hashlib

def get_razorpay_client():
    return razorpay.Client(auth=(os.environ["RAZORPAY_KEY_ID"], os.environ["RAZORPAY_KEY_SECRET"]))

def verify_razorpay_signature(order_id: str, payment_id: str, signature: str) -> bool:
    secret = os.environ["RAZORPAY_KEY_SECRET"].encode()
    msg = f"{order_id}|{payment_id}".encode()
    expected = hmac.new(secret, msg, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)

def verify_razorpay_webhook(body: bytes, signature: str) -> bool:
    secret = os.environ["RAZORPAY_WEBHOOK_SECRET"].encode()
    expected = hmac.new(secret, body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
```

---

## Task 7 — Seller Onboarding

```python
@api_router.post("/marketplace/seller/onboard")
async def seller_onboard(data: SellerOnboardRequest, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    now = datetime.now(timezone.utc).isoformat()
    await db.marketplace_sellers.update_one(
        {"seller_user_id": user.user_id},
        {"$set": {
            "seller_user_id": user.user_id,
            "display_name": data.display_name,
            "bio": data.bio,
            "payout_method": data.payout_method,
            "payout_details": data.payout_details,
            "available_for_hire": data.available_for_hire,
            "hire_contact": data.hire_contact,
            "verified": False,
            "onboarded_at": now,
        }},
        upsert=True,
    )
    await db.seller_wallets.update_one(
        {"seller_user_id": user.user_id},
        {"$setOnInsert": {
            "seller_user_id": user.user_id,
            "balance_cents": 0,
            "escrow_cents": 0,
            "total_earned_cents": 0,
            "lifetime_sales": 0,
            "created_at": now,
        }},
        upsert=True,
    )
    return {"ok": True}
```

---

## Task 8 — Product CRUD

```python
@api_router.post("/marketplace/products")
async def create_product(data: MarketplaceProductCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    seller = await db.marketplace_sellers.find_one({"seller_user_id": user.user_id})
    if not seller:
        raise HTTPException(status_code=403, detail="Complete seller onboarding first")

    if data.setup_available and (not data.setup_price_cents or not data.setup_description or not data.setup_delivery_days):
        raise HTTPException(status_code=400, detail="setup_price_cents, setup_description, and setup_delivery_days are required when setup_available=true")

    product_id = str(uuid.uuid4())
    doc = {
        "product_id": product_id,
        "seller_user_id": user.user_id,
        **data.dict(),
        "screenshots": [],
        "r2_file_key": None,
        "published": False,
        "purchase_count": 0,
        "setup_count": 0,
        "avg_rating": 0.0,
        "review_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.marketplace_products.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/marketplace/products")
async def list_products(q: Optional[str] = None, category: Optional[str] = None,
                        sort: str = "newest", page: int = 1, limit: int = 20):
    limit = min(limit, 50)
    query: dict = {"published": True, "r2_file_key": {"$ne": None}}
    if q:
        query["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"tagline": {"$regex": q, "$options": "i"}},
        ]
    if category:
        query["category"] = category
    sort_map = {
        "newest": ("created_at", -1),
        "best_sellers": ("purchase_count", -1),
        "top_rated": ("avg_rating", -1),
        "price_asc": ("source_price_cents", 1),
        "price_desc": ("source_price_cents", -1),
    }
    field, direction = sort_map.get(sort, ("created_at", -1))
    cursor = (db.marketplace_products
              .find(query, {"_id": 0, "description": 0, "r2_file_key": 0})
              .sort(field, direction).skip((page - 1) * limit).limit(limit))
    products = await cursor.to_list(limit)
    for p in products:
        seller = await db.marketplace_sellers.find_one(
            {"seller_user_id": p["seller_user_id"]},
            {"_id": 0, "display_name": 1, "verified": 1},
        )
        p["seller_name"] = (seller or {}).get("display_name")
        p["seller_verified"] = (seller or {}).get("verified", False)
    return {"products": products, "page": page}

@api_router.get("/marketplace/my-products")
async def list_my_products(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    products = await (db.marketplace_products
                      .find({"seller_user_id": user.user_id}, {"_id": 0, "r2_file_key": 0})
                      .sort("created_at", -1).to_list(100))
    return {"products": products}

@api_router.get("/marketplace/products/{product_id}")
async def get_product(product_id: str):
    product = await db.marketplace_products.find_one({"product_id": product_id}, {"_id": 0, "r2_file_key": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    seller = await db.marketplace_sellers.find_one(
        {"seller_user_id": product["seller_user_id"]},
        {"_id": 0, "payout_details": 0},
    )
    user_doc = await db.users.find_one({"user_id": product["seller_user_id"]}, {"_id": 0, "email": 0})
    product["seller"] = {**(seller or {}), "name": (user_doc or {}).get("name"),
                         "picture": (user_doc or {}).get("picture")}
    return product

@api_router.patch("/marketplace/products/{product_id}")
async def update_product(product_id: str, data: MarketplaceProductUpdate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    product = await db.marketplace_products.find_one({"product_id": product_id})
    if not product or product["seller_user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    update = {k: v for k, v in data.dict(exclude_none=True).items()}
    if not update:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    await db.marketplace_products.update_one({"product_id": product_id}, {"$set": update})
    return {"ok": True}

@api_router.delete("/marketplace/products/{product_id}")
async def delete_product(product_id: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    product = await db.marketplace_products.find_one({"product_id": product_id})
    if not product or product["seller_user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    # Don't allow delete if there are completed purchases (data integrity)
    has_sales = await db.marketplace_purchases.count_documents(
        {"product_id": product_id, "status": "completed"}, limit=1
    )
    if has_sales:
        raise HTTPException(status_code=400, detail="Cannot delete a product with sales. Unpublish instead.")
    await db.marketplace_products.delete_one({"product_id": product_id})
    return {"ok": True}
```

---

## Task 9 — Screenshot Upload

```python
from fastapi import UploadFile, File

@api_router.post("/marketplace/products/{product_id}/screenshots")
async def upload_screenshot(product_id: str, file: UploadFile = File(...), request: Request = None):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    product = await db.marketplace_products.find_one({"product_id": product_id})
    if not product or product["seller_user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if len(product.get("screenshots", [])) >= 5:
        raise HTTPException(status_code=400, detail="Maximum 5 screenshots allowed")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be under 5 MB")
    url = await upload_public_image_to_r2(content, file.filename or "img.png", folder=f"products/{product_id}")
    await db.marketplace_products.update_one(
        {"product_id": product_id}, {"$push": {"screenshots": url}}
    )
    updated = await db.marketplace_products.find_one({"product_id": product_id}, {"_id": 0, "screenshots": 1})
    return updated

@api_router.delete("/marketplace/products/{product_id}/screenshots")
async def delete_screenshot(product_id: str, url: str, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    product = await db.marketplace_products.find_one({"product_id": product_id})
    if not product or product["seller_user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.marketplace_products.update_one(
        {"product_id": product_id}, {"$pull": {"screenshots": url}}
    )
    return {"ok": True}
```

---

## Task 10 — ZIP Upload

```python
@api_router.post("/marketplace/products/{product_id}/upload")
async def upload_product_zip(product_id: str, file: UploadFile = File(...), request: Request = None):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    product = await db.marketplace_products.find_one({"product_id": product_id})
    if not product or product["seller_user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if not (file.filename or "").lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only ZIP files are accepted")
    content = await file.read()
    if len(content) > 500 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 500 MB)")
    key = await upload_private_to_r2(content, file.filename, folder=f"products/{product_id}")
    await db.marketplace_products.update_one(
        {"product_id": product_id}, {"$set": {"r2_file_key": key}}
    )
    return {"ok": True}
```

---

## Task 11 — Publish Toggle

```python
@api_router.patch("/marketplace/products/{product_id}/publish")
async def toggle_publish(product_id: str, published: bool, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    product = await db.marketplace_products.find_one({"product_id": product_id})
    if not product or product["seller_user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if published and not product.get("r2_file_key"):
        raise HTTPException(status_code=400, detail="Upload a ZIP file before publishing")
    if published and not product.get("screenshots"):
        raise HTTPException(status_code=400, detail="Upload at least one screenshot before publishing")
    await db.marketplace_products.update_one(
        {"product_id": product_id}, {"$set": {"published": published}}
    )
    return {"ok": True, "published": published}
```

---

## Task 12 — Razorpay Create Order

```python
@api_router.post("/marketplace/checkout/create-order")
async def create_order(data: CreateOrderRequest, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    product = await db.marketplace_products.find_one({"product_id": data.product_id})
    if not product or not product.get("published") or not product.get("r2_file_key"):
        raise HTTPException(status_code=404, detail="Product not available")
    if user.user_id == product["seller_user_id"]:
        raise HTTPException(status_code=400, detail="You cannot buy your own product")

    if data.purchase_type == "source":
        amount_cents = product["source_price_cents"]
    else:  # source_and_setup
        if not product.get("setup_available"):
            raise HTTPException(status_code=400, detail="Setup is not offered for this product")
        amount_cents = product["source_price_cents"] + product["setup_price_cents"]

    rzp = get_razorpay_client()
    order = rzp.order.create({
        "amount": amount_cents,           # Razorpay uses smallest currency unit (paise/cents)
        "currency": "USD",
        "receipt": str(uuid.uuid4())[:32],
        "notes": {
            "product_id": data.product_id,
            "buyer_user_id": user.user_id,
            "purchase_type": data.purchase_type,
        },
    })

    purchase_id = str(uuid.uuid4())
    await db.marketplace_purchases.insert_one({
        "purchase_id": purchase_id,
        "buyer_user_id": user.user_id,
        "product_id": data.product_id,
        "purchase_type": data.purchase_type,
        "amount_cents": amount_cents,
        "razorpay_order_id": order["id"],
        "razorpay_payment_id": None,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "order_id": order["id"],
        "amount_cents": amount_cents,
        "currency": "USD",
        "razorpay_key_id": os.environ["RAZORPAY_KEY_ID"],
        "purchase_id": purchase_id,
    }
```

---

## Task 13 — Razorpay Verify Payment

This is the **trusted credit path**. After Razorpay Checkout completes on the frontend, it calls this with the three signed values. We verify the HMAC signature, mark the purchase complete, credit the wallet, and create a setup-request if needed.

```python
@api_router.post("/marketplace/checkout/verify-payment")
async def verify_payment(data: VerifyPaymentRequest, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    if not verify_razorpay_signature(data.razorpay_order_id, data.razorpay_payment_id, data.razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    purchase = await db.marketplace_purchases.find_one({"razorpay_order_id": data.razorpay_order_id})
    if not purchase or purchase["buyer_user_id"] != user.user_id:
        raise HTTPException(status_code=404, detail="Purchase not found")
    if purchase["status"] == "completed":
        return {"ok": True, "purchase_id": purchase["purchase_id"]}  # idempotent

    product = await db.marketplace_products.find_one({"product_id": purchase["product_id"]})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    fee_pct = int(os.environ.get("PLATFORM_FEE_PERCENT", "15"))
    seller_id = product["seller_user_id"]
    now = datetime.now(timezone.utc)

    # Mark purchase completed
    await db.marketplace_purchases.update_one(
        {"purchase_id": purchase["purchase_id"]},
        {"$set": {"status": "completed", "razorpay_payment_id": data.razorpay_payment_id,
                  "completed_at": now.isoformat()}},
    )

    # Credit wallet
    source_seller_cut = int(product["source_price_cents"] * (100 - fee_pct) / 100)
    await db.seller_wallets.update_one(
        {"seller_user_id": seller_id},
        {"$inc": {"balance_cents": source_seller_cut, "total_earned_cents": source_seller_cut, "lifetime_sales": 1}},
    )
    await db.wallet_transactions.insert_one({
        "seller_user_id": seller_id, "type": "sale",
        "amount_cents": source_seller_cut, "product_id": product["product_id"],
        "purchase_id": purchase["purchase_id"], "created_at": now.isoformat(),
        "note": f"Sale: {product['title']}",
    })
    await db.marketplace_products.update_one(
        {"product_id": product["product_id"]}, {"$inc": {"purchase_count": 1}}
    )

    # If setup was bought → escrow
    if purchase["purchase_type"] == "source_and_setup":
        setup_seller_cut = int(product["setup_price_cents"] * (100 - fee_pct) / 100)
        auto_release = (now + timedelta(days=7 + (product.get("setup_delivery_days") or 3))).isoformat()
        request_id = str(uuid.uuid4())
        await db.setup_requests.insert_one({
            "request_id": request_id,
            "buyer_user_id": user.user_id,
            "seller_user_id": seller_id,
            "product_id": product["product_id"],
            "purchase_id": purchase["purchase_id"],
            "status": "pending",
            "escrow_amount_cents": setup_seller_cut,
            "buyer_confirmed": False,
            "auto_release_at": auto_release,
            "created_at": now.isoformat(),
        })
        await db.seller_wallets.update_one(
            {"seller_user_id": seller_id}, {"$inc": {"escrow_cents": setup_seller_cut}}
        )
        await db.wallet_transactions.insert_one({
            "seller_user_id": seller_id, "type": "setup_escrow",
            "amount_cents": setup_seller_cut, "product_id": product["product_id"],
            "purchase_id": purchase["purchase_id"], "created_at": now.isoformat(),
            "note": "Setup payment held in escrow",
        })
        await db.marketplace_products.update_one(
            {"product_id": product["product_id"]}, {"$inc": {"setup_count": 1}}
        )

    return {"ok": True, "purchase_id": purchase["purchase_id"]}
```

---

## Task 14 — Razorpay Webhook

Used as a backup in case the frontend never calls `verify-payment` (network error, browser closed). Same logic — idempotent because we check `status == "completed"`.

```python
@api_router.post("/marketplace/webhook/razorpay")
async def razorpay_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("x-razorpay-signature", "")
    if not verify_razorpay_webhook(body, sig):
        raise HTTPException(status_code=400, detail="Invalid signature")
    event = json.loads(body)
    if event.get("event") == "payment.captured":
        payment = event["payload"]["payment"]["entity"]
        order_id = payment.get("order_id")
        payment_id = payment.get("id")
        purchase = await db.marketplace_purchases.find_one({"razorpay_order_id": order_id})
        if purchase and purchase["status"] != "completed":
            # Reuse the same flow as verify_payment by calling internal helper
            # (Refactor verify_payment's body into a shared `_complete_purchase` helper.)
            await _complete_purchase(purchase, payment_id)
    return {"ok": True}
```

> **Implementation note:** factor the body of Task 13 into `async def _complete_purchase(purchase, payment_id)` so both `verify_payment` and the webhook can call it.

---

## Task 15 — Buyer Purchases & Download

```python
@api_router.get("/marketplace/my-purchases")
async def my_purchases(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    purchases = await (db.marketplace_purchases
                       .find({"buyer_user_id": user.user_id, "status": "completed"},
                             {"_id": 0, "razorpay_order_id": 0, "razorpay_payment_id": 0})
                       .sort("created_at", -1).to_list(200))
    # Hydrate with product info + setup status
    for p in purchases:
        product = await db.marketplace_products.find_one(
            {"product_id": p["product_id"]},
            {"_id": 0, "title": 1, "tagline": 1, "screenshots": 1, "category": 1},
        )
        p["product"] = product
        if p["purchase_type"] == "source_and_setup":
            sr = await db.setup_requests.find_one({"purchase_id": p["purchase_id"]}, {"_id": 0})
            p["setup_request"] = sr
    return {"purchases": purchases}

@api_router.get("/marketplace/download/{purchase_id}")
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
    return {"download_url": get_r2_signed_url(product["r2_file_key"], expiry_seconds=300)}
```

---

## Task 16 — Setup Request Endpoints

```python
@api_router.get("/marketplace/setup-requests")
async def list_setup_requests(request: Request):
    """Seller view: pending + in-progress setup jobs they need to fulfill."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    items = await (db.setup_requests
                   .find({"seller_user_id": user.user_id}, {"_id": 0})
                   .sort("created_at", -1).to_list(100))
    # Hydrate buyer + product
    for it in items:
        buyer = await db.users.find_one({"user_id": it["buyer_user_id"]}, {"_id": 0, "name": 1, "email": 1, "picture": 1})
        product = await db.marketplace_products.find_one({"product_id": it["product_id"]}, {"_id": 0, "title": 1})
        it["buyer"] = buyer
        it["product_title"] = (product or {}).get("title")
    return {"requests": items}

@api_router.patch("/marketplace/setup-requests/{request_id}/status")
async def update_setup_status(request_id: str, data: SetupStatusUpdate, request: Request):
    """Seller marks in-progress or completed."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    sr = await db.setup_requests.find_one({"request_id": request_id})
    if not sr or sr["seller_user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if sr["status"] in {"completed", "auto_released"}:
        raise HTTPException(status_code=400, detail="Already finalized")
    update = {"status": data.status}
    if data.note:
        update["seller_note"] = data.note
    if data.status == "completed":
        update["completed_at"] = datetime.now(timezone.utc).isoformat()
    await db.setup_requests.update_one({"request_id": request_id}, {"$set": update})
    return {"ok": True}

@api_router.post("/marketplace/setup-requests/{request_id}/confirm")
async def buyer_confirm_setup(request_id: str, request: Request):
    """Buyer confirms setup is done → release escrow to seller balance."""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    sr = await db.setup_requests.find_one({"request_id": request_id})
    if not sr or sr["buyer_user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if sr.get("buyer_confirmed"):
        return {"ok": True}  # idempotent

    await _release_setup_escrow(sr, reason="buyer_confirmed")
    return {"ok": True}

# Shared helper (use from confirm + auto-release worker)
async def _release_setup_escrow(sr: dict, reason: str):
    now = datetime.now(timezone.utc).isoformat()
    await db.setup_requests.update_one(
        {"request_id": sr["request_id"]},
        {"$set": {"buyer_confirmed": True, "status": "completed" if reason == "buyer_confirmed" else "auto_released",
                  "released_at": now, "release_reason": reason}},
    )
    await db.seller_wallets.update_one(
        {"seller_user_id": sr["seller_user_id"]},
        {"$inc": {"balance_cents": sr["escrow_amount_cents"],
                  "total_earned_cents": sr["escrow_amount_cents"],
                  "escrow_cents": -sr["escrow_amount_cents"]}},
    )
    await db.wallet_transactions.insert_one({
        "seller_user_id": sr["seller_user_id"], "type": "setup_released",
        "amount_cents": sr["escrow_amount_cents"], "product_id": sr["product_id"],
        "purchase_id": sr["purchase_id"], "created_at": now,
        "note": f"Setup escrow released ({reason})",
    })
```

---

## Task 17 — Auto-Release Worker

Run a scheduled background task (FastAPI `lifespan` + asyncio loop, or call from an external cron hitting an admin endpoint). For Render's free tier, the simplest approach is an in-process async loop that runs every hour.

```python
async def auto_release_escrow_loop():
    while True:
        try:
            now_iso = datetime.now(timezone.utc).isoformat()
            cursor = db.setup_requests.find({
                "status": {"$in": ["pending", "in_progress", "completed"]},
                "buyer_confirmed": False,
                "auto_release_at": {"$lte": now_iso},
            })
            async for sr in cursor:
                try:
                    await _release_setup_escrow(sr, reason="auto_released_7d")
                    logger.info(f"auto-released setup escrow {sr['request_id']}")
                except Exception as e:
                    logger.exception(f"auto-release failed for {sr['request_id']}: {e}")
        except Exception as e:
            logger.exception(f"auto-release loop error: {e}")
        await asyncio.sleep(60 * 60)  # hourly

# Start in the existing FastAPI lifespan / startup hook:
@app.on_event("startup")
async def _start_workers():
    asyncio.create_task(auto_release_escrow_loop())
```

---

## Task 18 — Wallet Endpoints

```python
@api_router.get("/marketplace/wallet")
async def get_wallet(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    wallet = await db.seller_wallets.find_one({"seller_user_id": user.user_id}, {"_id": 0})
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found — onboard as a seller first")
    txns = await (db.wallet_transactions
                  .find({"seller_user_id": user.user_id}, {"_id": 0})
                  .sort("created_at", -1).limit(100).to_list(100))
    return {"wallet": wallet, "transactions": txns}

@api_router.post("/marketplace/wallet/withdraw")
async def request_withdrawal(data: WithdrawalRequest, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    wallet = await db.seller_wallets.find_one({"seller_user_id": user.user_id})
    if not wallet or wallet["balance_cents"] < data.amount_cents:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    seller = await db.marketplace_sellers.find_one({"seller_user_id": user.user_id})
    if not seller:
        raise HTTPException(status_code=400, detail="Seller record missing")

    now = datetime.now(timezone.utc).isoformat()
    req_id = str(uuid.uuid4())
    await db.withdrawal_requests.insert_one({
        "request_id": req_id,
        "seller_user_id": user.user_id,
        "amount_cents": data.amount_cents,
        "payout_method": seller["payout_method"],
        "payout_details": seller["payout_details"],
        "status": "pending",
        "created_at": now,
    })
    await db.seller_wallets.update_one(
        {"seller_user_id": user.user_id},
        {"$inc": {"balance_cents": -data.amount_cents}},
    )
    await db.wallet_transactions.insert_one({
        "seller_user_id": user.user_id, "type": "withdrawal_request",
        "amount_cents": -data.amount_cents, "product_id": None, "purchase_id": None,
        "created_at": now, "note": f"Withdrawal requested ({seller['payout_method']})",
    })
    return {"ok": True, "request_id": req_id}
```

> Withdrawal processing is **manual** in v1 — you receive an email/admin alert and process via Razorpay X / UPI / bank transfer, then mark the row `processed`. A future admin endpoint can flip the status.

---

## Task 19 — Product Reviews

```python
@api_router.post("/marketplace/products/{product_id}/reviews")
async def create_review(product_id: str, data: ReviewCreate, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    purchase = await db.marketplace_purchases.find_one({
        "buyer_user_id": user.user_id, "product_id": product_id, "status": "completed"
    })
    if not purchase:
        raise HTTPException(status_code=403, detail="You must purchase this product before reviewing")

    existing = await db.product_reviews.find_one({"buyer_user_id": user.user_id, "product_id": product_id})
    if existing:
        raise HTTPException(status_code=400, detail="You already reviewed this product")

    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "name": 1, "picture": 1})
    review = {
        "review_id": str(uuid.uuid4()),
        "product_id": product_id,
        "buyer_user_id": user.user_id,
        "buyer_name": (user_doc or {}).get("name"),
        "buyer_picture": (user_doc or {}).get("picture"),
        "rating": data.rating,
        "text": data.text,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.product_reviews.insert_one(review)

    # Recompute aggregate
    pipeline = [
        {"$match": {"product_id": product_id}},
        {"$group": {"_id": "$product_id", "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
    ]
    agg = await db.product_reviews.aggregate(pipeline).to_list(1)
    if agg:
        await db.marketplace_products.update_one(
            {"product_id": product_id},
            {"$set": {"avg_rating": round(agg[0]["avg"], 2), "review_count": agg[0]["count"]}},
        )
    review.pop("_id", None)
    return review

@api_router.get("/marketplace/products/{product_id}/reviews")
async def list_reviews(product_id: str, page: int = 1, limit: int = 20):
    limit = min(limit, 50)
    cursor = (db.product_reviews
              .find({"product_id": product_id}, {"_id": 0, "buyer_user_id": 0})
              .sort("created_at", -1).skip((page - 1) * limit).limit(limit))
    reviews = await cursor.to_list(limit)
    return {"reviews": reviews, "page": page}
```

---

## Task 20 — Seller Dashboard Aggregate

One endpoint to power the entire seller dashboard so the frontend doesn't fan out 5 calls.

```python
@api_router.get("/marketplace/seller/dashboard")
async def seller_dashboard(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    seller = await db.marketplace_sellers.find_one({"seller_user_id": user.user_id}, {"_id": 0, "payout_details": 0})
    if not seller:
        return {"onboarded": False}
    wallet = await db.seller_wallets.find_one({"seller_user_id": user.user_id}, {"_id": 0}) or {}
    pending_setups = await db.setup_requests.count_documents(
        {"seller_user_id": user.user_id, "status": {"$in": ["pending", "in_progress"]}}
    )
    products_count = await db.marketplace_products.count_documents({"seller_user_id": user.user_id})
    return {
        "onboarded": True,
        "seller": seller,
        "wallet": wallet,
        "pending_setup_requests": pending_setups,
        "products_count": products_count,
    }
```

---

## Task 21 — Public Seller Profile (Hire / Verified Badge)

```python
@api_router.get("/marketplace/seller/{seller_id}")
async def get_public_seller(seller_id: str):
    seller = await db.marketplace_sellers.find_one(
        {"seller_user_id": seller_id},
        {"_id": 0, "payout_details": 0},
    )
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
    user_doc = await db.users.find_one({"user_id": seller_id}, {"_id": 0, "email": 0})
    products = await (db.marketplace_products
                      .find({"seller_user_id": seller_id, "published": True},
                            {"_id": 0, "description": 0, "r2_file_key": 0})
                      .to_list(50))
    return {"seller": {**seller, "name": (user_doc or {}).get("name"),
                       "picture": (user_doc or {}).get("picture")},
            "products": products}
```

> **Phase 7 integration:** the existing `GET /api/users/{user_id}` already returns `products`. Update its `marketplace_products` projection to also include `seller.available_for_hire` and `seller.hire_contact` so `UserProfilePage.js` can render the **"Hire Me"** button.

---

## Task 22 — Cross-Feature Lookup Endpoints

These power the "Wave 1" connection fixes — surfacing marketplace listings inside the Repo Translator, DeadToolDetector, ToolDetail, Comparison, and IdeaExists pages so the entire app feeds the marketplace flywheel.

```python
@api_router.get("/marketplace/products/by-repo")
async def products_by_repo(owner: str, repo: str):
    """Return any LIVE marketplace product whose `github_repo_url` points to this repo.
    Used by GitHubRepoPage to render a 'Buy a ready-to-deploy version' banner.
    Cheap query (no auth needed)."""
    needle = f"github.com/{owner}/{repo}"
    products = await (db.marketplace_products
                      .find({"published": True, "r2_file_key": {"$ne": None},
                             "github_repo_url": {"$regex": needle, "$options": "i"}},
                            {"_id": 0, "description": 0, "r2_file_key": 0})
                      .limit(5).to_list(5))
    for p in products:
        seller = await db.marketplace_sellers.find_one(
            {"seller_user_id": p["seller_user_id"]},
            {"_id": 0, "display_name": 1, "verified": 1},
        )
        p["seller_name"] = (seller or {}).get("display_name")
        p["seller_verified"] = (seller or {}).get("verified", False)
    return {"products": products}

@api_router.get("/marketplace/products/by-tool/{tool_id}")
async def products_by_tool(tool_id: str):
    """Return marketplace products tagged with a specific tool ID.
    Currently we associate by github_repo_url match against the tool's `github_url` field.
    Used by ToolDetailPage and DeadToolDetector to surface paid alternatives."""
    tool = await db.tools.find_one({"_id": tool_id}) or await db.tools.find_one({"slug": tool_id})
    if not tool or not tool.get("github_url"):
        return {"products": []}
    match = re.search(r"github\.com/([^/]+)/([^/#?]+)", tool["github_url"])
    if not match:
        return {"products": []}
    return await products_by_repo(match.group(1), match.group(2))
```

> **Why this matters:** the entire app — repo translator, dead-tool detector, tool detail, comparison, idea-exists — becomes a feeder into the marketplace with a single lookup. The `<MarketplaceTeaser />` component in Phase 4 calls these.

---

## Verification

1. `POST /api/marketplace/seller/onboard` (auth) with UPI details → `marketplace_sellers` + `seller_wallets` rows created.
2. `POST /api/marketplace/products` → DRAFT product (`published: false`, no `r2_file_key`).
3. `POST /api/marketplace/products/{id}/screenshots` → public R2 URL pushed onto product.
4. `POST /api/marketplace/products/{id}/upload` → ZIP uploaded, `r2_file_key` set.
5. `PATCH /api/marketplace/products/{id}/publish` with `published=true` → product live.
6. `GET /api/marketplace/products` → returns it. Filter by category/sort works.
7. `POST /api/marketplace/checkout/create-order` → returns Razorpay order ID.
8. Pay via Razorpay test mode → frontend calls `verify-payment` → purchase becomes `completed`, wallet credited 85%.
9. If `purchase_type=source_and_setup` → setup_request row created, escrow incremented.
10. `GET /api/marketplace/my-purchases` → buyer sees it with download link.
11. `GET /api/marketplace/download/{purchase_id}` → 5-minute signed R2 URL.
12. `POST /api/marketplace/products/{id}/reviews` (after purchase) → `avg_rating` updated.
13. Seller marks setup `completed` → buyer hits `confirm` → escrow → balance.
14. Don't confirm for 7 days → auto-release loop releases on schedule.
15. `POST /api/marketplace/wallet/withdraw` → `withdrawal_requests` row, balance decrements.
16. Razorpay webhook with valid signature → idempotent re-completion (no double-credit).
