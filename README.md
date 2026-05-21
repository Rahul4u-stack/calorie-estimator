# Calorie Estimator

Upload a food photo, get instant calorie estimates — for people who quit nutrition apps because logging is too slow.

🔗 **Live:** [calorie-estimator.vercel.app](https://calorie-estimator.vercel.app)

![tech](https://img.shields.io/badge/Claude-Sonnet_4.6-blue) ![tech](https://img.shields.io/badge/React-18-61dafb) ![tech](https://img.shields.io/badge/Flask-3.0-black) ![ci](https://img.shields.io/badge/CI-passing-brightgreen)

---

## Why this exists

Manual food logging takes 20–30 seconds per item; most users abandon nutrition apps within a week because of this friction. Multimodal AI now lets users skip text entry entirely — snap, submit, done. Built it both to solve the friction and to ship a public **Claude Vision case study**.

## What this demonstrates

**Multimodal (vision) prompting with structured JSON output and graceful failure handling.** The backend sends a food image to Claude and gets back schema-conformant JSON (`isFood`, `items[]`, `totalCalories`, `notes`), with explicit non-food detection so the UI can route to a "this doesn't look like food" empty state instead of hallucinating calories for a cat photo.

## AI tools used

- **`claude-sonnet-4-6`** via Anthropic SDK (Vision API)
- **Structured JSON output** prompted via schema-in-prompt (not native JSON mode — wider compatibility across models)
- **Regex JSON extraction** as a defensive layer (Claude sometimes wraps JSON in prose despite instructions)

## Tech stack

React 18 + Vite + Tailwind frontend · Flask + Anthropic SDK backend · `heic2any` for browser HEIC→JPEG conversion · Vercel (frontend) + Render (backend) · pytest + Vitest + GitHub Actions CI.

## Architecture decisions

- **Sonnet over Haiku** — food images need detailed visual reasoning to itemize multi-component meals; Haiku output was too coarse-grained ("a hamburger" instead of burger + fries + drink).
- **Browser-side HEIC conversion over backend `pillow-heif`** — `pillow-heif` requires `libheif` system library which broke Render's free-tier build. Moving conversion to the client also reduces backend payload size.
- **JSON schema-in-prompt over OpenAI-style function calling** — more portable across model versions and easier to debug. Occasional malformed responses handled via regex extraction + 502 fallback.
- **5 MB client-side size guard over unbounded uploads** — Render free-tier cold-starts on large payloads can time out. Client guard fails fast with a friendly message instead of a 30s hang.
- **Server-side `logging` for API errors** rather than swallow-to-JSON-only — makes Render dashboard logs actually useful for production debugging.

## What's next / v2

- **Serving-size detection** — currently estimates whole-plate calories; users sometimes want per-piece.
- **Lightweight history** (localStorage or Supabase) so users can revisit yesterday's estimates.
- **Evals on a labeled test set** (50–100 food photos with known calorie ranges) to measure accuracy drift across model versions. Currently I trust Sonnet's outputs without ground truth.

## How it works

```
┌─────────┐    image    ┌──────────┐   JSON   ┌──────────────┐
│ React   │ ──────────→ │  Flask   │ ──────→  │ Claude       │
│ Vite    │             │  /api/   │          │ Vision API   │
│ (FE)    │ ←────────── │  analyze │ ←──────  │ (Sonnet 4.6) │
└─────────┘   results   └──────────┘          └──────────────┘
   Vercel                  Render                 Anthropic
```

Frontend client-side validates file (size, type, HEIC conversion), POSTs to `/api/analyze`. Backend sends image to Claude Vision with a JSON-schema-in-prompt, regex-extracts JSON from the response, returns it. Frontend renders structured result card (total calories + per-item list + notes).

## Local development

### Prerequisites

- Node.js 18+
- Python 3.9+
- Anthropic API key — [get one here](https://console.anthropic.com/)

### Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
echo "ANTHROPIC_API_KEY=your_key_here" > .env
python3 app.py                       # runs on http://localhost:5001
```

### Frontend

```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:5001" > .env
npm run dev                          # http://localhost:5173
```

### Tests

```bash
# Backend (10 tests)
cd backend
pip install -r requirements-dev.txt
ANTHROPIC_API_KEY=test_dummy pytest -v

# Frontend (5 tests)
cd frontend
npm run test:run
```

## CI

`.github/workflows/ci.yml` runs both test suites on every push and PR to `main`.

## Built by

[Rahul Agarwal](https://www.linkedin.com/in/rahul-agar/) — Product Manager · AI Builder · 7 years in fintech & payments.

Hiring a PM for a payments or AI-forward team? [Portfolio](https://ai-portfolio-seven-drab.vercel.app/) · [LinkedIn](https://www.linkedin.com/in/rahul-agar/)
