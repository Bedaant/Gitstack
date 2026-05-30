# Claude Signal Prototype

Trust calibration system for AI-generated code. Surfaces invisible reasoning assumptions so users verify the THINKING, not just the OUTPUT.

## Run Locally

```bash
cd signal
npm install
npm run dev
```

Open http://localhost:5173

## Build

```bash
npm run build
```

Static files output to `dist/`.

## What It Demonstrates

1. **Code Generation + Signal Banner** — Enter a prompt, see generated code with a colored confidence banner
2. **Assumption Registry** — Click the banner to expand structured reasoning cards (Goal → Approach → Assumptions)
3. **Override Flow** — Click "Override" on any assumption → confirm → inline `[Signal]` comment appears in code
4. **Calibration Sidebar** — Tracks override decisions in localStorage, shows progress (0/5 → active calibration)

## Demo Prompts

- "Create a Python login endpoint"
- "Build a file upload handler"
- "Export user data as CSV"
