# Phase 0 — Auth Re-Enabling

> **Read `plan.md` first** for full codebase context before implementing anything here.

## Goal

The backend auth system is fully built and working. The frontend `AuthContext.js` is currently a guest-only stub that disables login. This phase wires up the frontend to use the real backend auth, which is a prerequisite for Phases 3, 6, and 7.

## Status

- [x] Task 1 — Replace AuthContext stub with real session management (via Clerk)
- [x] Task 2 — Wire AuthCallback — N/A, Clerk handles callbacks internally
- [x] Task 3 — Add login button and user avatar to Header
- [x] Task 4 — Add auth guard utility for protected routes
- [x] Task 5 — Protect `/u/me` and `/dashboard` routes

---

## Current State (what you will find)

### `frontend/src/context/AuthContext.js`
```js
export const AuthProvider = ({ children }) => {
  const [user] = useState(null);
  const login = () => console.log("Login disabled");
  const logout = () => console.log("Logout disabled");
  return (
    <AuthContext.Provider value={{ user, loading: false, login, logout, checkAuth: () => {} }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### `frontend/src/components/AuthCallback.js`
Already fully implemented — it reads `session_id` from the URL hash and calls `POST /api/auth/session`, then calls `checkAuth()`. It will work as-is once `checkAuth` is real.

### Backend auth endpoints (already working)
- `POST /api/auth/session` — body: `{ session_id }` → sets HttpOnly `session_token` cookie, returns user object
- `GET /api/auth/me` — reads cookie → returns `{ user_id, email, name, picture }` or 401
- `POST /api/auth/logout` — clears cookie + DB record

---

## Task 1 — Replace AuthContext stub

**File:** `frontend/src/context/AuthContext.js`

Replace the entire file with a real implementation:

```js
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import axios from "axios";
import { API } from "../utils/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(res.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = () => {
    // Redirect to Emergent OAuth — replace with the actual OAuth URL from your provider
    window.location.href = `https://auth.emergentmind.com/oauth?redirect_uri=${encodeURIComponent(window.location.origin)}`;
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch { /* ignore */ }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
```

**Important:** Verify the actual Emergent OAuth URL from the existing backend code (`server.py`) — search for the OAuth redirect URL used in `/api/auth/session` to find the correct provider URL and use that in `login()`.

---

## Task 2 — Verify AuthCallback works

**File:** `frontend/src/components/AuthCallback.js`

No changes needed — the component already calls `checkAuth()` after posting the session. Confirm it works end-to-end after Task 1 is done by reviewing the logic:

```js
await axios.post(`${API}/auth/session`, { session_id: sessionId }, { withCredentials: true });
await checkAuth();   // <-- this now sets user state correctly
toast.success("Logged in successfully!");
navigate('/dashboard', { replace: true });
```

---

## Task 3 — Add login button and user avatar to Header

**File:** `frontend/src/components/Header.js`

1. Import `useAuth` at the top: `import { useAuth } from '../context/AuthContext';`
2. Inside the `Header` component, call: `const { user, login, logout } = useAuth();`
3. In the desktop nav (right side, after the "Build Stack" button), add:

```jsx
{user ? (
  <div className="flex items-center gap-2">
    <img
      src={user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2563EB&color=fff`}
      alt={user.name}
      className="w-8 h-8 rounded-full border-2 border-black"
    />
    <button
      onClick={logout}
      className="text-sm font-semibold hover:text-primary transition-colors"
    >
      Logout
    </button>
  </div>
) : (
  <button
    onClick={login}
    className="bg-primary text-white font-bold px-4 py-2 border-2 border-black neo-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all text-sm"
  >
    Login
  </button>
)}
```

4. Add the same login/logout UI to the mobile menu section (match the existing mobile nav pattern in the file).

---

## Task 4 — Create auth guard utility

**File:** `frontend/src/components/RequireAuth.js` (new file)

```jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const RequireAuth = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
};
```

---

## Task 5 — Protect routes in App.js

**File:** `frontend/src/App.js`

1. Import `RequireAuth`: `import { RequireAuth } from "./components/RequireAuth";`
2. Wrap the `/dashboard` and any future auth-required routes:

```jsx
<Route path="/dashboard" element={
  <RequireAuth><Dashboard /></RequireAuth>
} />
```

3. Add a `/u/me` redirect route (used in Phase 7):

```jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

// Add near the top of route definitions:
<Route path="/u/me" element={<MeRedirect />} />
```

Where `MeRedirect` is a small inline component:
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

1. Open the app. The Header should show a "Login" button.
2. Click Login — should redirect to the OAuth provider.
3. After completing OAuth, return URL should contain `#session_id=...` hash — `AuthCallback` fires, calls `/api/auth/session`, then `/api/auth/me`, and the Header should now show the user's avatar.
4. Reload the page — user should still be logged in (cookie persists).
5. Click Logout — user should be cleared, Header shows "Login" again.
6. Navigate to `/dashboard` while logged out — should redirect to `/`.
7. Navigate to `/u/me` while logged in — should redirect to `/u/{user_id}`.
