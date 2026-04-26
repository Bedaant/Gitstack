# Phase 1 — Dark / Light Mode Toggle

> **Read `plan.md` first** for full codebase context before implementing anything here.

## Goal

Add a dark/light mode toggle to the app. All infrastructure is already in place — just needs wiring.

## Prerequisites

None. This phase is fully independent.

## Status

- [ ] Task 1 — Add dark-mode CSS variables to `index.css`
- [ ] Task 2 — Wrap `<App>` in `ThemeProvider`
- [ ] Task 3 — Create `ThemeToggle` component
- [ ] Task 4 — Add `ThemeToggle` to Header
- [ ] Task 5 — Audit and fix hardcoded light-only classes

---

## What's Already In Place (do NOT re-install or re-configure)

- `next-themes ^0.4.6` is already in `package.json` — no install needed.
- `tailwind.config.js` already has `darkMode: ["class"]` — Tailwind will apply dark variants when `class="dark"` is on `<html>`.
- `lucide-react ^0.507.0` is already installed — use `Sun` and `Moon` icons.
- `tailwind.config.js` already declares `background`, `foreground`, `primary`, etc. as `hsl(var(--XXX))` Tailwind color tokens.

### Current CSS variable situation

`frontend/src/index.css` has hex-based `:root` variables:
```css
:root {
  --background: #FFFFFF;
  --foreground: #0A0A0A;
  --primary: #2563EB;
  ...
}
```

**BUT** `tailwind.config.js` maps `background` to `hsl(var(--background))` — which means the existing hex values in `:root` are NOT currently used by Tailwind's color tokens; the shadcn/ui HSL variable system is what Tailwind uses. You need to check `frontend/src/index.css` fully for the shadcn HSL variable block (it may be further down the file) and add the `.dark` block there, not just to the hex variables.

---

## Task 1 — Add dark-mode CSS variables

**File:** `frontend/src/index.css`

Read the full file first. Find the `@layer base` block or the `:root` block that contains HSL variables used by shadcn (e.g. `--background: 0 0% 100%;`). Add a `.dark` override block immediately after it:

```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 224.3 76.3% 48%;
}
```

Also update the existing hex-based `:root` block so `body`/`html` background and text colors respond to dark mode:

```css
.dark body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}
```

---

## Task 2 — Wrap App in ThemeProvider

**File:** `frontend/src/App.js`

1. Add import at the top:
```js
import { ThemeProvider } from "next-themes";
```

2. Wrap the outermost element in `App()`:
```jsx
function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <HelmetProvider>
        <BrowserRouter>
          <AuthProvider>
            <AppRouter />
            <Toaster position="bottom-right" />
          </AuthProvider>
        </BrowserRouter>
      </HelmetProvider>
    </ThemeProvider>
  );
}
```

`ThemeProvider` must be the outermost wrapper so `class="dark"` is applied to `<html>`.

---

## Task 3 — Create ThemeToggle component

**File:** `frontend/src/components/ThemeToggle.js` (new file)

```jsx
import React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      className="p-2 border-2 border-black neo-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
    >
      {resolvedTheme === "dark" ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Moon className="w-4 h-4" />
      )}
    </button>
  );
};
```

---

## Task 4 — Add ThemeToggle to Header

**File:** `frontend/src/components/Header.js`

1. Import the component: `import { ThemeToggle } from "./ThemeToggle";`
2. In the desktop nav, add `<ThemeToggle />` to the right side, immediately before the "Build Stack" button (or the Login button if Phase 0 is already done).
3. Also add `<ThemeToggle />` inside the mobile menu, near the bottom of the mobile nav items list.

---

## Task 5 — Audit and fix hardcoded light-only classes

Search for elements that will look broken in dark mode because they use hardcoded colors.

Key patterns to find and fix across all files in `frontend/src/`:

| Hardcoded class | Replace with |
|----------------|--------------|
| `bg-white` | `bg-background` or `bg-card` |
| `bg-white/95` | `bg-background/95` |
| `text-black` | `text-foreground` |
| `text-gray-900` | `text-foreground` |
| `text-gray-600` | `text-muted-foreground` |
| `border-gray-200` | `border-border` |
| `bg-gray-50` | `bg-muted` |
| `bg-gray-100` | `bg-muted` |

**Start with these files** (highest visibility):
- `frontend/src/components/Header.js` — currently uses `bg-white/95` on the header bar
- `frontend/src/components/Footer.js`
- `frontend/src/pages/HomePage.js`
- `frontend/src/pages/ToolsPage.js`
- `frontend/src/pages/ToolDetailPage.js`

**Important:** Neo-brutalist elements intentionally use black borders and shadows (`border-black`, `neo-shadow`) — do NOT change these. Only fix backgrounds and text colors.

---

## Verification

1. Open the app — it should default to system theme.
2. Click the ThemeToggle in the Header — the `<html>` element should get `class="dark"`.
3. Dark mode: background should be dark navy (#0D1117 range), text should be near-white.
4. Toggle back to light — full light theme restored.
5. Reload the page — chosen theme should persist (next-themes stores in localStorage).
6. Check Header, Footer, ToolsPage, ToolDetailPage — no white/black artifacts visible in dark mode.
