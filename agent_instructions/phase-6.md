# Phase 6 — Personalized Recommendations

> **Read `plan.md` first** for full codebase context before implementing anything here.

## Goal

Track what a logged-in user has viewed and used, then use Gemini to surface 6 tools/repos they haven't seen yet. Show these recommendations on the Dashboard and Homepage.

## Prerequisites

- **Phase 0 (auth) must be complete.** Activity tracking and recommendations require a real `user_id`.

## Status

- [ ] Task 1 — Add `user_activity` collection and activity tracking endpoint (backend)
- [ ] Task 2 — Add recommendations endpoint (backend)
- [ ] Task 3 — Fire activity events from frontend pages
- [ ] Task 4 — Create `RecommendationsSection` component
- [ ] Task 5 — Add recommendations to Dashboard page
- [ ] Task 6 — Add "For You" section to HomePage for logged-in users

---

## New MongoDB Collection

**`user_activity`** — lightweight event log:

```json
{
  "user_id": "string",
  "event_type": "tool_viewed | repo_viewed | stack_saved | topic_visited",
  "entity_id": "string",  // tool_id, 'owner/repo', stack name, or topic_id
  "created_at": "ISO datetime"
}
```

Create a TTL index on `created_at` to auto-delete events older than 90 days (keeps the collection lean):
```python
# In the startup/seed logic of server.py:
await db.user_activity.create_index("created_at", expireAfterSeconds=90 * 24 * 3600)
await db.user_activity.create_index([("user_id", 1), ("created_at", -1)])
```

---

## Task 1 — Activity tracking endpoint

**File:** `backend/server.py`

Add Pydantic model:
```python
class ActivityEvent(BaseModel):
    event_type: str = Field(..., pattern="^(tool_viewed|repo_viewed|stack_saved|topic_visited)$")
    entity_id: str = Field(..., min_length=1, max_length=200)
```

Add endpoint (rate-limit to 60/min to prevent flooding):
```python
@app.post("/api/activity")
@limiter.limit("60/minute")
async def track_activity(data: ActivityEvent, request: Request):
    user = await get_current_user(request)
    if not user:
        return {"ok": False}  # silently ignore guest events — never error

    await db.user_activity.insert_one({
        "user_id": user.user_id,
        "event_type": data.event_type,
        "entity_id": data.entity_id,
        "created_at": datetime.now(timezone.utc),
    })
    return {"ok": True}
```

---

## Task 2 — Recommendations endpoint

**File:** `backend/server.py`

```python
@app.get("/api/recommendations")
@limiter.limit("10/minute")
async def get_recommendations(request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Check 2-hour cache on user record
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    cache = user_doc.get("recommendations_cache") if user_doc else None
    if cache:
        cached_at = cache.get("cached_at")
        if cached_at:
            # Parse and check age
            from datetime import timezone as tz
            import dateutil.parser
            try:
                age_seconds = (datetime.now(timezone.utc) - dateutil.parser.parse(cached_at)).total_seconds()
                if age_seconds < 7200:  # 2 hours
                    return {"recommendations": cache["tools"]}
            except Exception:
                pass

    # Fetch last 30 activity events
    events = await db.user_activity.find(
        {"user_id": user.user_id},
        {"_id": 0, "entity_id": 1, "event_type": 1},
    ).sort("created_at", -1).limit(30).to_list(30)

    if not events:
        # New user — return a default set of highly-rated tools
        defaults = await db.tools.find({}, {"_id": 0, "name": 1, "description": 1, "github_url": 1, "stars": 1, "category": 1, "tags": 1}).limit(6).to_list(6)
        return {"recommendations": defaults}

    seen_ids = {e["entity_id"] for e in events}
    activity_summary = ", ".join(e["entity_id"] for e in events[:15])

    prompt = f"""A user has been exploring these tools and repos on Gitstack: {activity_summary}.

Based on this activity, recommend exactly 6 different tools from the Gitstack catalog that they would likely find useful and haven't explicitly seen yet.

Return ONLY a JSON array of tool names (strings), e.g.: ["tool-name-1", "tool-name-2", ...]

Focus on tools that complement or extend what the user is already interested in."""

    recommended_names = []
    for model_name in ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-pro"]:
        try:
            import google.generativeai as genai
            genai.configure(api_key=os.environ["GEMINI_API_KEY"])
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            text = response.text.strip()
            # Extract JSON array
            import re, json
            match = re.search(r'\[.*?\]', text, re.DOTALL)
            if match:
                recommended_names = json.loads(match.group())
                break
        except Exception:
            continue

    # Fetch matching tool docs
    results = []
    for name in recommended_names[:6]:
        tool = await db.tools.find_one(
            {"name": {"$regex": name, "$options": "i"}},
            {"_id": 0},
        )
        if not tool:
            tool = await db.github_repos.find_one(
                {"name": {"$regex": name, "$options": "i"}},
                {"_id": 0},
            )
        if tool and tool.get("tool_id", tool.get("id")) not in seen_ids:
            results.append(tool)
        if len(results) >= 6:
            break

    # Cache on user doc
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"recommendations_cache": {"tools": results, "cached_at": datetime.now(timezone.utc).isoformat()}}},
    )

    return {"recommendations": results}
```

**Note:** `python-dateutil` may need to be added to `requirements.txt` if not already present. Check first — if `dateutil` is unavailable, replace with a simpler timestamp arithmetic approach using `datetime.fromisoformat()`.

---

## Task 3 — Fire activity events from frontend pages

In each of these pages, add a fire-and-forget `useEffect` that calls `POST /api/activity` when the page loads, only if the user is logged in.

### Pattern to use (same in all pages):

```js
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { API } from "../utils/api";

// Inside the component:
const { user } = useAuth();

useEffect(() => {
  if (!user || !entityId) return;
  // Fire and forget — never await, never show errors
  axios.post(`${API}/activity`, { event_type: "XXXX", entity_id: entityId }, { withCredentials: true }).catch(() => {});
}, [user, entityId]);
```

### Apply to:

| File | `event_type` | `entity_id` |
|------|-------------|-------------|
| `frontend/src/pages/ToolDetailPage.js` | `tool_viewed` | `toolId` param from `useParams()` |
| `frontend/src/pages/GitHubRepoPage.js` | `repo_viewed` | `` `${owner}/${repo}` `` from `useParams()` |
| `frontend/src/pages/TopicToolsPage.js` | `topic_visited` | `topicId` param from `useParams()` |

Do NOT block rendering on this call. Do NOT show any error if it fails.

---

## Task 4 — Create RecommendationsSection component

**File:** `frontend/src/components/sections/RecommendationsSection.js` (new file)

```jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

const ToolChip = ({ tool }) => (
  <Link
    to={`/tools/${tool.tool_id || tool.id || tool.name}`}
    className="block border-2 border-black p-4 neo-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all bg-background"
  >
    <div className="font-bold text-sm mb-1 line-clamp-1">{tool.name}</div>
    <div className="text-xs text-muted-foreground line-clamp-2">{tool.description}</div>
    {tool.stars && (
      <div className="text-xs text-muted-foreground mt-1">⭐ {tool.stars}</div>
    )}
  </Link>
);

export const RecommendationsSection = () => {
  const { user } = useAuth();
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    axios.get(`${API}/recommendations`, { withCredentials: true })
      .then(res => setTools(res.data.recommendations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user || (!loading && tools.length === 0)) return null;

  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <h2 className="text-2xl font-extrabold mb-2 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          For You
        </h2>
        <p className="text-muted-foreground mb-6 text-sm">Personalized picks based on what you've been exploring.</p>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border-2 border-black h-20 animate-pulse bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {tools.map((t, i) => <ToolChip key={i} tool={t} />)}
          </div>
        )}
      </div>
    </section>
  );
};
```

---

## Task 5 — Add RecommendationsSection to Dashboard

**File:** `frontend/src/pages/Dashboard.js`

1. Import: `import { RecommendationsSection } from "../components/sections/RecommendationsSection";`
2. Add `<RecommendationsSection />` near the top of the page content, above the saved stacks list.

---

## Task 6 — Add "For You" to HomePage

**File:** `frontend/src/pages/HomePage.js`

1. Import: `import { RecommendationsSection } from "../components/sections/RecommendationsSection";`
2. Add `<RecommendationsSection />` after the Hero section and before the Trending section.

The component already handles the guest case by returning `null` — no auth check needed in HomePage.

---

## Verification

1. Log in, then visit several tool pages and topic pages.
2. Visit `/dashboard` — "For You" section should appear with up to 6 cards.
3. The recommended tools should be different from what you just viewed.
4. Reload the page — recommendations should load from cache (same 6, fast).
5. Wait 2+ hours (or manually clear the `recommendations_cache` field from the user's MongoDB doc) — new recommendations should appear.
6. Visit `HomePage` while logged in — "For You" section appears between Hero and Trending.
7. Open the app in an incognito window (guest) — "For You" section is not visible anywhere.
