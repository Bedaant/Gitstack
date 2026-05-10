---
description: Design system rules and visual identity for GitStack
---

# GitStack Design DNA

This document defines the core visual identity and design rules for GitStack. When building new features or pages, you MUST adhere to these rules to maintain a consistent "neo-brutalist" aesthetic.

## 1. Core Aesthetic: Neo-Brutalism

GitStack uses a **Neo-Brutalist** design system. This means:
- **Thick, bold black borders** on almost everything (buttons, cards, inputs).
- **Hard, sharp shadows** (no soft blurring). Shadows are solid black `#09090B`.
- **High contrast** typography.
- **Vibrant pastel accents** against stark black and white.

## 2. Typography

- **Headings (h1-h6):** `Bricolage Grotesque` (bold, impactful, tight tracking).
- **Body Text:** `DM Sans` (clean, highly readable).
- **Code/Monospace:** `IBM Plex Mono` (technical, mechanical).
- **Heading Styling:** Always use `font-black` or `font-extrabold` for major headings. Often uppercase for section titles (`uppercase tracking-tight`).

## 3. Shadows & Borders

DO NOT use Tailwind's default `shadow-md` or `shadow-lg` (which use soft blurred alpha shadows).
INSTEAD, use the custom CSS classes defined in `index.css`:

- **`.neo-card`**: The default container for lists, tools, and content blocks.
  - Has a 2px black border and a 4px solid black shadow.
  - Hovers up (`-translate-y-2`) and increases shadow depth to 6px.
- **`.neo-shadow`**: For raw elements (images, badges) that need the 4px block shadow.
- **`.neo-shadow-lg`**: For modals, dropdowns, and featured items (6px block shadow).
- **Borders:** Use `border-2 border-black` or `border-4 border-black`. Avoid thin 1px borders unless inside a dense table.

## 4. Colors

We rely on CSS variables for dark mode support, with specific pastel accents:

- **Backgrounds:** Always use `bg-background` (never hardcode `bg-white`).
- **Text:** Always use `text-foreground` or `text-muted-foreground` (never hardcode `text-black` or `text-gray-500`).
- **Primary Button:** `bg-[#2563EB]` (Blue) with white text. Use `.neo-btn-primary`.
- **Secondary Button:** `bg-background` with foreground text. Hovers to pastel yellow. Use `.neo-btn-secondary`.
- **Accents (defined as CSS vars):**
  - `var(--pastel-yellow)`: `#FEF08A`
  - `var(--pastel-mint)`: `#A7F3D0`
  - `var(--pastel-pink)`: `#FBCFE8`
  - `var(--pastel-lavender)`: `#E9D5FF`

## 5. UI Primitives

Always use these custom classes instead of rebuilding from scratch with Tailwind utilities:

### Buttons
```jsx
// Primary action (Blue)
<button className="neo-btn neo-btn-primary px-6 py-2">Click Me</button>

// Secondary action (White/Dark, hovers Yellow)
<button className="neo-btn neo-btn-secondary px-6 py-2">Click Me</button>

// Danger action (Black, red shadow)
<button className="neo-btn neo-btn-danger px-6 py-2">Delete</button>
```

### Inputs
```jsx
// Forms, search bars
<input className="neo-input" placeholder="Type here..." />
```

### Badges (Difficulty/Status)
```jsx
<span className="badge-beginner px-2 py-1 text-sm font-bold">Beginner</span>
<span className="badge-intermediate px-2 py-1 text-sm font-bold">Intermediate</span>
<span className="badge-advanced px-2 py-1 text-sm font-bold">Advanced</span>
```

## 6. Layout & Spacing

- **Max Width:** Use `max-w-7xl` for main page containers, `max-w-4xl` or `max-w-3xl` for reading text/forms.
- **Padding:** Sections should have generous vertical padding (`py-12` or `py-16` on desktop, `py-8` on mobile).
- **Corners:** Keep border-radius tight or zero. No `rounded-full` or `rounded-3xl` unless specifically required for an avatar. Small radiuses (`rounded` or `rounded-md`) are acceptable if the black border is thick.

## 7. Icons

- Use **Lucide React** (`lucide-react`) for all UI icons.
- Keep icons thick (`strokeWidth={2}` or `2.5`).
- Size: `w-5 h-5` or `w-6 h-6` for buttons, `w-4 h-4` for inline text.

## 8. Dark Mode Rules

- **Never hardcode hex colors for surfaces.**
- If you need a card background, use `bg-background`.
- If you need a subtle gray background, use `bg-muted` or `bg-zinc-100 dark:bg-zinc-900`.
- The neo-brutalist shadows remain black even in dark mode.
- The borders remain black or very dark gray (`border-black dark:border-zinc-800`).

## 9. Prose / Markdown Content

When rendering AI-generated text or Markdown, wrap it in a div with the `prose-gitstack` class. This applies the correct typography, spacing, and brutalist heading styles (e.g., h2 gets a thick black underline).

```jsx
<div className="prose-gitstack" dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
```
