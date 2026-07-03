# PromptForge

A category-aware prompt enhancer. Paste a rough prompt, pick a category, and PromptForge rewrites it into a high-quality, model-appropriate prompt, tuned to a target model and priced live from the registry. **It rewrites prompts. It never answers them.**

Next.js 15 App Router, TypeScript strict, Tailwind, Zod, IndexedDB.

## Quick start

```bash
pnpm install
cp env.example .env.local   # then fill in real values
pnpm dev                    # http://localhost:3000
```

The repo `.env` already carries working `API_KEY` / `BASE_URL` for local use. Route handlers read the key server-side only; it never reaches the client bundle.

### Environment

`lib/client.ts` accepts either naming, so both of these work:

```
MODEL_API_BASE_URL=https://api.openai.com/v1
MODEL_API_KEY=...
# or the shorthand (bare host is fine, /v1 is appended automatically):
BASE_URL=https://api.openai.com/
API_KEY=...
```

## Scripts

- `pnpm dev` — local dev.
- `pnpm build` — production build; passes with zero TS errors.
- `pnpm test` — vitest (26 tests; no live endpoint calls).

## What's inside

- **Forge** (`/`) — the workbench: raw ore in, forged prompt out, with a word-level diff, a changes ledger, assumptions, optional variants, live cost, and model selection.
- **Library** (`/library`) — reusable prompt structures (scaffolds) per category. Load one into the forge and enhance it.
- **History** (`/history`) — every forge, saved locally in IndexedDB. Search, favorite, re-forge, delete.
- **Settings** (`/settings`) — theme, default category, per-category rewriter overrides, default knobs, endpoint status, and the full model-registry reference.

## Guardrails

- The enhancer never answers the prompt. Every meta-prompt carries the "rewrite, don't answer" clause (`lib/meta-prompt.ts`), verified by unit tests and live.
- Rewriters are text-output LLMs only; image/TTS/ASR/embedding models are selectable as targets, never rewriters (`lib/registry.ts`, enforced again at the API boundary).
- Model JSON output is validated with Zod before it is ever rendered; a parse failure retries once with a stricter instruction, then surfaces a clean error.
- The `medical` category rewrites framing only, never injects clinical facts, and keeps a non-diagnostic directive.
