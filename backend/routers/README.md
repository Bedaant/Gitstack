# Backend Routers (Modularization Roadmap)

This directory will contain FastAPI routers split from the monolithic `server.py`.

## Planned Routers

| Router | Routes | Status |
|--------|--------|--------|
| `auth.py` | `/auth/*` | Planned |
| `ai.py` | `/ai/*`, `/repo-of-the-day` | Planned |
| `marketplace.py` | `/marketplace/*`, `/admin/products/*` | Planned |
| `tools.py` | `/tools/*`, `/topics/*`, `/collections/*` | Planned |
| `stacks.py` | `/stacks/*`, `/my-stacks` | Planned |
| `admin.py` | `/admin/*` (blog, scraper, drip) | Planned |
| `seo.py` | `/sitemap*`, `/alternatives/*` | Planned |

## Migration Pattern

```python
# routers/ai.py
from fastapi import APIRouter, HTTPException, Request
import server  # Access shared deps: server.db, server.limiter, server.get_current_user

router = APIRouter()

@router.post("/ai/stack-generator")
@server.limiter.limit("10/minute")
async def stack_generator(request: Request):
    ...

# server.py (at bottom)
from routers.ai import router as ai_router
api_router.include_router(ai_router)
```

## Why

`server.py` is 6255+ lines. Splitting into routers:
- Eliminates merge conflicts
- Enables per-router tests
- Makes the codebase maintainable
- Prevents "one file breaks everything" deploy issues
