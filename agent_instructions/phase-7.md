# Phase 7 — Personal User Profile Page

> **Read `plan.md` first** for full codebase context before implementing anything here.

## Goal

A shareable, resume-like profile page at `/u/:userId`. Each user can list their skills, connect their GitHub username, and share the page with HR or investors. The page shows their published stacks, GitHub repos with AI summaries, marketplace products, and skills — all in one public URL.

## Prerequisites

- **Phase 0 (auth) must be complete.** Profile editing requires `user` state. The public view is open to everyone.

## Status

- [ ] Task 1 — Extend UserModel and add profile update endpoint (backend)
- [ ] Task 2 — Add public user profile endpoint (backend)
- [ ] Task 3 — Add GitHub repos endpoint (backend)
- [ ] Task 4 — Create `UserProfilePage.js` — public view
- [ ] Task 5 — Add route and `/u/me` redirect in App.js

---

## Task 1 — Extend UserModel and add PATCH endpoint

**File:** `backend/server.py`

### Extend `UserModel`

Find the existing `UserModel` Pydantic class and add the new optional fields:

```python
class UserModel(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime
    # New profile fields
    github_username: Optional[str] = None
    bio: Optional[str] = None
    website: Optional[str] = None
    skills: List[str] = []
    public_profile: bool = True
```

### Add PATCH model

```python
class UpdateProfileRequest(BaseModel):
    github_username: Optional[str] = Field(None, max_length=50, pattern=r'^[a-zA-Z0-9\-]+$')
    bio: Optional[str] = Field(None, max_length=300)
    website: Optional[str] = Field(None, max_length=200)
    skills: Optional[List[str]] = Field(None, max_length=20)  # max 20 skills
    public_profile: Optional[bool] = None
```

### Add PATCH endpoint

```python
@app.patch("/api/users/me")
async def update_my_profile(data: UpdateProfileRequest, request: Request):
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    update: dict = {}
    if data.github_username is not None:
        update["github_username"] = data.github_username
    if data.bio is not None:
        update["bio"] = data.bio
    if data.website is not None:
        # Basic URL safety check
        if data.website and not data.website.startswith(("https://", "http://")):
            raise HTTPException(status_code=400, detail="Website must be a valid URL")
        update["website"] = data.website
    if data.skills is not None:
        # Sanitize skills: strip whitespace, max 30 chars each
        update["skills"] = [s.strip()[:30] for s in data.skills if s.strip()][:20]
    if data.public_profile is not None:
        update["public_profile"] = data.public_profile

    if update:
        await db.users.update_one({"user_id": user.user_id}, {"$set": update})

    updated = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "email": 0})
    return updated
```

---

## Task 2 — Public user profile endpoint

**File:** `backend/server.py`

```python
@app.get("/api/users/{user_id}")
async def get_user_profile(user_id: str):
    user = await db.users.find_one(
        {"user_id": user_id},
        {"_id": 0, "email": 0},  # never expose email
    )
    if not user or not user.get("public_profile", True):
        raise HTTPException(status_code=404, detail="Profile not found")

    # Fetch their public stacks
    stacks = await db.stacks.find(
        {"user_id": user_id, "is_public": True},
        {"_id": 0, "name": 1, "tools": 1, "copy_count": 1, "slug": 1, "created_at": 1},
    ).sort("copy_count", -1).limit(10).to_list(10)

    # Fetch their marketplace products (if Phase 3 is done)
    try:
        products = await db.marketplace_products.find(
            {"seller_user_id": user_id, "r2_file_key": {"$ne": None}},
            {"_id": 0, "description": 0, "r2_file_key": 0},
        ).limit(12).to_list(12)
    except Exception:
        products = []

    return {
        "user": user,
        "stacks": stacks,
        "products": products,
    }
```

---

## Task 3 — GitHub repos endpoint

**File:** `backend/server.py`

This endpoint fetches the user's top public GitHub repos (if they've set `github_username`) and attaches cached AI translations where available.

```python
@app.get("/api/users/{user_id}/repos")
async def get_user_repos(user_id: str):
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "github_username": 1, "public_profile": 1})
    if not user or not user.get("public_profile", True):
        raise HTTPException(status_code=404, detail="Profile not found")

    github_username = user.get("github_username")
    if not github_username:
        return {"repos": []}

    # Fetch from GitHub API
    headers = {"Accept": "application/vnd.github+json"}
    if os.environ.get("GITHUB_TOKEN"):
        headers["Authorization"] = f"Bearer {os.environ['GITHUB_TOKEN']}"

    import httpx
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(
                f"https://api.github.com/users/{github_username}/repos",
                params={"sort": "stars", "per_page": 10, "type": "owner"},
                headers=headers,
                timeout=10,
            )
            res.raise_for_status()
            repos = res.json()
        except Exception:
            return {"repos": []}

    # Attach cached translations
    result = []
    for repo in repos[:10]:
        if repo.get("fork"):
            continue  # skip forks
        owner = repo.get("owner", {}).get("login", github_username)
        name = repo.get("name", "")
        translation = await db.repo_translations.find_one(
            {"owner": owner, "repo": name}, {"_id": 0, "translation": 1, "summary": 1}
        )
        result.append({
            "name": name,
            "full_name": repo.get("full_name"),
            "description": repo.get("description"),
            "url": repo.get("html_url"),
            "stars": repo.get("stargazers_count", 0),
            "language": repo.get("language"),
            "translation": translation.get("translation") or translation.get("summary") if translation else None,
        })

    return {"repos": result}
```

---

## Task 4 — Create UserProfilePage.js

**File:** `frontend/src/pages/UserProfilePage.js` (new file)

API calls:
- `GET /api/users/:userId` — profile + stacks + products
- `GET /api/users/:userId/repos` — GitHub repos
- `GET /api/ai/translate-repo/:owner/:repo` — on-demand if repo has no cached translation
- `PATCH /api/users/me` — edit mode (only for own profile)

### Component outline (implement fully):

```jsx
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { API } from "../utils/api";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SEO } from "../components/SEO";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Github, Globe, Share2, Edit2, ChevronDown, ChevronUp, Star } from "lucide-react";

const UserProfilePage = () => {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stacks, setStacks] = useState([]);
  const [products, setProducts] = useState([]);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [expandedRepo, setExpandedRepo] = useState(null);
  const [translatingRepo, setTranslatingRepo] = useState(null);

  const isOwnProfile = currentUser?.user_id === userId;

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [profileRes, reposRes] = await Promise.all([
          axios.get(`${API}/users/${userId}`),
          axios.get(`${API}/users/${userId}/repos`),
        ]);
        setProfile(profileRes.data.user);
        setStacks(profileRes.data.stacks || []);
        setProducts(profileRes.data.products || []);
        setRepos(reposRes.data.repos || []);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [userId]);

  // On-demand repo translation (if no cached translation)
  const expandRepo = async (repo) => {
    if (expandedRepo === repo.full_name) {
      setExpandedRepo(null);
      return;
    }
    setExpandedRepo(repo.full_name);
    if (!repo.translation) {
      setTranslatingRepo(repo.full_name);
      try {
        const [owner, name] = repo.full_name.split("/");
        const res = await axios.get(`${API}/ai/translate-repo/${owner}/${name}`);
        setRepos(prev => prev.map(r =>
          r.full_name === repo.full_name
            ? { ...r, translation: res.data.translation || res.data.summary }
            : r
        ));
      } catch { /* ignore */ } finally {
        setTranslatingRepo(null);
      }
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`https://gitstack.pro/u/${userId}`);
    toast.success("Profile URL copied!");
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
        </div>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Header />
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Profile not found</h1>
          <Link to="/" className="text-primary font-semibold hover:underline">Back to Home</Link>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <SEO
        title={`${profile.name} — GitStack Profile`}
        description={profile.bio || `${profile.name}'s developer profile on GitStack`}
      />
      <Header />
      <main className="max-w-5xl mx-auto px-4 md:px-8 py-12">
        {/* Profile header */}
        <div className="border-4 border-black neo-shadow p-6 mb-10 flex flex-col sm:flex-row items-start gap-6">
          <img
            src={profile.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=2563EB&color=fff&size=96`}
            alt={profile.name}
            className="w-20 h-20 rounded-full border-4 border-black flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-3xl font-extrabold">{profile.name}</h1>
              <button onClick={handleShare} title="Share profile" className="p-1.5 border-2 border-black hover:bg-muted transition-colors">
                <Share2 className="w-4 h-4" />
              </button>
              {isOwnProfile && (
                <button onClick={() => setEditMode(e => !e)} className="flex items-center gap-1.5 text-sm font-bold border-2 border-black px-3 py-1 hover:bg-muted transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Profile
                </button>
              )}
            </div>
            {profile.bio && <p className="text-muted-foreground mb-3">{profile.bio}</p>}
            <div className="flex flex-wrap gap-4 text-sm font-semibold">
              {profile.github_username && (
                <a href={`https://github.com/${profile.github_username}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-primary transition-colors">
                  <Github className="w-4 h-4" /> {profile.github_username}
                </a>
              )}
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-primary transition-colors">
                  <Globe className="w-4 h-4" /> Website
                </a>
              )}
            </div>
            {profile.skills?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.skills.map(s => (
                  <span key={s} className="text-xs font-bold bg-black text-white px-2 py-0.5 uppercase tracking-wide">{s}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Edit panel (own profile only) */}
        {editMode && isOwnProfile && (
          <EditProfilePanel
            profile={profile}
            onSave={(updated) => { setProfile(prev => ({ ...prev, ...updated })); setEditMode(false); }}
            onCancel={() => setEditMode(false)}
          />
        )}

        <div className="space-y-12">
          {/* GitHub Repos section */}
          {repos.length > 0 && (
            <section>
              <h2 className="text-xl font-extrabold mb-4 flex items-center gap-2">
                <Github className="w-5 h-5" /> GitHub Repositories
              </h2>
              <div className="space-y-3">
                {repos.map(repo => (
                  <div key={repo.full_name} className="border-2 border-black">
                    <button
                      onClick={() => expandRepo(repo)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-muted transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold">{repo.name}</span>
                          {repo.language && <span className="text-xs font-semibold bg-muted px-2 py-0.5 border border-border">{repo.language}</span>}
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Star className="w-3 h-3" />{repo.stars}</span>
                        </div>
                        {repo.description && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{repo.description}</p>}
                      </div>
                      {expandedRepo === repo.full_name ? <ChevronUp className="w-4 h-4 flex-shrink-0 ml-2" /> : <ChevronDown className="w-4 h-4 flex-shrink-0 ml-2" />}
                    </button>
                    {expandedRepo === repo.full_name && (
                      <div className="border-t-2 border-black p-4 bg-muted/50">
                        {translatingRepo === repo.full_name ? (
                          <p className="text-sm text-muted-foreground animate-pulse">Getting AI summary...</p>
                        ) : repo.translation ? (
                          <div
                            className="prose prose-sm max-w-none text-foreground"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(repo.translation)) }}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">No summary available.</p>
                        )}
                        <a href={repo.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline mt-3">
                          <Github className="w-3 h-3" /> View on GitHub
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Published Stacks */}
          {stacks.length > 0 && (
            <section>
              <h2 className="text-xl font-extrabold mb-4">Published Stacks</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {stacks.map(stack => (
                  <Link key={stack.slug || stack._id} to={`/s/${stack.slug}`} className="block border-2 border-black p-4 neo-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all bg-background">
                    <div className="font-bold mb-1">{stack.name}</div>
                    <div className="flex flex-wrap gap-1">
                      {(stack.tools || []).slice(0, 5).map(t => (
                        <span key={t} className="text-xs bg-muted px-1.5 py-0.5 border border-border">{t}</span>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">{stack.copy_count || 0} copies</div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Marketplace Products */}
          {products.length > 0 && (
            <section>
              <h2 className="text-xl font-extrabold mb-4">Marketplace Products</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map(p => (
                  <Link key={p.product_id} to={`/marketplace/${p.product_id}`} className="block border-2 border-black p-4 neo-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all bg-background">
                    <div className="font-bold mb-1 line-clamp-1">{p.title}</div>
                    <div className="text-sm text-muted-foreground line-clamp-2">{p.tagline}</div>
                    <div className="font-black text-primary mt-2">{(p.price_cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}</div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};
```

### EditProfilePanel sub-component

Implement as a component within the same file:

```jsx
const EditProfilePanel = ({ profile, onSave, onCancel }) => {
  const [form, setForm] = useState({
    github_username: profile.github_username || "",
    bio: profile.bio || "",
    website: profile.website || "",
    skills: (profile.skills || []).join(", "),
    public_profile: profile.public_profile !== false,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await axios.patch(`${API}/users/me`, {
        github_username: form.github_username || null,
        bio: form.bio || null,
        website: form.website || null,
        skills: form.skills.split(",").map(s => s.trim()).filter(Boolean),
        public_profile: form.public_profile,
      }, { withCredentials: true });
      toast.success("Profile updated!");
      onSave(res.data);
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-4 border-black p-6 mb-8 bg-muted/30">
      <h3 className="font-bold text-lg mb-4">Edit Profile</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold mb-1">GitHub Username</label>
          <input value={form.github_username} onChange={e => setForm(f => ({ ...f, github_username: e.target.value }))}
            className="w-full border-2 border-black px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. torvalds" />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">Website</label>
          <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
            className="w-full border-2 border-black px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="https://yoursite.com" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-bold mb-1">Bio (max 300 chars)</label>
          <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} maxLength={300} rows={2}
            className="w-full border-2 border-black px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-bold mb-1">Skills (comma-separated, max 20)</label>
          <input value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))}
            className="w-full border-2 border-black px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" placeholder="React, Python, TypeScript, FastAPI" />
        </div>
      </div>
      <div className="flex items-center gap-4 mt-4">
        <button onClick={handleSave} disabled={saving}
          className="bg-primary text-white font-bold px-5 py-2 border-2 border-black neo-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-60">
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button onClick={onCancel} className="font-bold px-4 py-2 border-2 border-black hover:bg-muted transition-colors">Cancel</button>
      </div>
    </div>
  );
};

export default UserProfilePage;
```

---

## Task 5 — Add routes in App.js

**File:** `frontend/src/App.js`

1. Import the page:
```js
import UserProfilePage from "./pages/UserProfilePage";
```

2. Add routes (add before the `/:owner/:repo` catch-all from Phase 2 if that exists):
```jsx
<Route path="/u/:userId" element={<UserProfilePage />} />
<Route path="/u/me" element={<MeRedirect />} />
```

`MeRedirect` is defined in Phase 0. If Phase 0 is not done yet, define it inline here:
```jsx
const MeRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  return <Navigate to={`/u/${user.user_id}`} replace />;
};
```

---

## Verification

1. While logged out, visit `/u/{any_valid_user_id}` — page loads correctly, showing the public profile.
2. Profile shows: avatar, name, bio, GitHub link, skills, shareable button.
3. If `github_username` is set: GitHub repos section appears. Click a repo row → expands. If no cached translation, an AI summary loads.
4. Click a GitHub repo row for a well-known repo (e.g. a repo already in `repo_translations` cache) → summary appears instantly.
5. Published stacks section appears if the user has any public stacks.
6. Marketplace products section appears if the user has any published products (Phase 3/4).
7. While logged in as the profile owner, an "Edit Profile" button appears. Save a bio change → visible on reload.
8. Click "Share" button → clipboard contains `gitstack.pro/u/{userId}`.
9. `/u/me` redirects correctly to `/u/{currentUser.user_id}`.
10. Paste `/u/{userId}` into Slack/Twitter → OG preview shows name and bio.
