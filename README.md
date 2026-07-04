# PromptForge

A category-aware prompt enhancer. Paste a rough prompt, pick a category, and PromptForge rewrites it into a high-quality, model-appropriate prompt — tuned to a target model and priced live from the registry. **It rewrites prompts. It never answers them.**

Next.js 15 App Router · TypeScript strict · Tailwind · Zod · IndexedDB

---

## Quick start

```bash
pnpm install
cp env.example .env.local   # fill in real values
pnpm dev                    # http://localhost:3000
```

### Environment

```
# OpenAI-compatible endpoint (server-only; never reaches the client bundle)
MODEL_API_BASE_URL=https://api.openai.com/v1
MODEL_API_KEY=sk-...

# Optional access gate for public deploys — leave blank for local dev
APP_ACCESS_PASSWORD=
```

`lib/client.ts` also accepts the shorthand aliases `BASE_URL` / `API_KEY` for backward compatibility. A bare host is fine — `/v1` is appended automatically.

---

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Local dev server at `http://localhost:3000` |
| `pnpm build` | Production build; passes with zero TS errors |
| `pnpm test` | Vitest unit suite (no live endpoint calls) |
| `node scripts/gen-models.mjs` | Regenerate `data/models.json` from `available-models.csv` |

---

## Pages

| Route | What it does |
|---|---|
| `/` | **Forge workbench** — raw ore in, forged prompt out |
| `/library` | Reusable prompt scaffolds per category; load one into the forge |
| `/history` | Every forge saved locally in IndexedDB — search, favorite, re-forge, delete |
| `/settings` | Theme, default category, per-category rewriter overrides, knobs, endpoint status, full model-registry reference |
| `/login` | Access gate page (only active when `APP_ACCESS_PASSWORD` is set) |

---

## Categories

Default order in the picker (left → right):

| Category | Glyph | Rewriter default | Target |
|---|---|---|---|
| **General** | `( )` | llama-3.3-70b-instruct | Any general LLM |
| **Research** | `[R]` | gpt-oss-120b | Frontier general LLM |
| **Multimodal** | `[#]` | gemma-4-31b-it | Multimodal LLM |
| **Medical** | `[+]` | medgemma-27b-it | Medical LLM (framing only, never diagnosis) |
| **Coding** | `{ }` | gpt-oss-120b | Any code model or general LLM |
| **Agentic** | `[>]` | nemotron-3-super-120b-a12b | Agentic-capable LLM |
| **Image Gen** | `[*]` | llama-3.3-70b-instruct | FLUX diffusion model |

**General** is the default on first load.

---

## Forge modes

| Mode | How it works |
|---|---|
| **Single** | Classic one-model rewrite. Fast and cheap. |
| **Reflexion** | One model rewrites, self-critiques, then improves. 1–3 extra rounds. |
| **Ensemble** | 2–5 rewriters run in parallel; a judge model synthesises the best result. |

---

## Workbench panels

- **CategoryPicker** — tab bar with auto-route (classifies your raw prompt and suggests a category automatically).
- **PromptScore** — live lint quality score for the raw prompt, per category.
- **ModeSelector** — switch between Single / Reflexion / Ensemble; set reflexion round count.
- **ModelPicker** — choose the rewriter and optional target model; shows live cost estimate.
- **KnobPanel** — strictness, verbosity, tone, preserve-wording toggles.
- **EnhancedOutput** — word-level diff, changes ledger, assumptions, optional variants, copy, re-forge, favorite.
- **ProvingGround** — opt-in side-by-side test: runs both the raw and enhanced prompt against a real target model and has a judge compare outputs. Completely separate from the enhancer path (hard rule #2 is never violated).
- **OptimizeLab** — generates several candidate rewrites, tests each, and returns a ranked leaderboard with the empirical winner.

---

## API routes

| Route | Method | Description |
|---|---|---|
| `/api/enhance` | `POST` | Core forge endpoint — single, reflexion, or ensemble mode |
| `/api/classify` | `POST` | Auto-route: classify a raw prompt into a category |
| `/api/eval` | `POST` | Proving Ground — run raw vs enhanced and judge the outputs |
| `/api/optimize` | `POST` | Optimize Lab — generate, test, and rank N candidate rewrites |
| `/api/health` | `GET` | Endpoint connectivity check |
| `/api/models` | `GET` | Full model registry as JSON |
| `/api/auth` | `POST` | Session login (only active when `APP_ACCESS_PASSWORD` is set) |

---

## Guardrails

- **Never answers.** Every meta-prompt carries the "rewrite, don't answer" clause (`lib/meta-prompt.ts`), verified by unit tests.
- **Rewriters are text-only.** Image / TTS / ASR / embedding models are selectable as *targets*, never as rewriters (`lib/registry.ts`, enforced at the API boundary).
- **Zod validation everywhere.** All model JSON output is validated before rendering; a parse failure retries once with a stricter instruction, then surfaces a clean error.
- **Proving Ground is opt-in and isolated.** It is the *only* surface that runs prompts against a target model, deliberately separate from the enhancer to preserve the no-answer guarantee.
- **Medical framing only.** The `medical` category rewrites clinical framing; it never injects facts, values, or history the user didn't provide, and always keeps a non-diagnostic directive.
- **Access gate.** Set `APP_ACCESS_PASSWORD` in production; every route (pages + API) requires a session cookie. The login page and `/api/auth` are excluded from the gate.

---

## Project structure

```
app/
  page.tsx                  # Forge workbench
  layout.tsx                # Root layout + theme init
  login/                    # Access gate page
  history/ library/         # Secondary pages
  settings/                 # Settings + model registry reference
  api/
    enhance/                # Core forge (single, reflexion, ensemble)
    classify/               # Auto-route classification
    eval/                   # Proving Ground
    optimize/               # Optimize Lab
    health/  models/  auth/

components/
  ForgeWorkbench            # Top-level workbench orchestrator
  CategoryPicker            # Category tabs + auto-route
  PromptInput               # Raw ore textarea
  PromptScore               # Real-time lint quality badge
  ModeSelector              # Single / Reflexion / Ensemble switcher
  ModelPicker               # Rewriter + target selectors
  KnobPanel                 # Rewrite knobs
  ForgeButton               # Submit + cost preview
  EnhancedOutput            # Diff, changes, variants, copy
  ProvingGround             # Raw vs enhanced side-by-side eval
  OptimizeLab               # Candidate ranking panel
  EnhancedOutput  AppShell  ThemeToggle  Wordmark  controls

lib/
  categories.ts             # CategoryDef data + CATEGORY_ORDER
  registry.ts               # Model registry + capability routing
  client.ts                 # All LLM call implementations
  schema.ts                 # Zod schemas for every API boundary
  lint.ts                   # Per-category prompt quality linter
  meta-prompt.ts            # Meta-prompt builder
  storage.ts                # IndexedDB history + localStorage settings
  auth.ts                   # Session token helpers
  diff.ts  format.ts  tokens.ts  templates.ts

middleware.ts               # Route-level access gate
```
