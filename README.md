# PromptForge

Two tools in one workspace:

- **Enhance** — describe what you want the AI to do, and PromptForge rewrites it into a clear, model-ready prompt you can paste anywhere. **It improves prompts. It never answers them.**
- **Chat** — an everyday multimodal assistant (text, vision, image generation, and voice) built on the same model registry, for tasks that don't need a frontier model. **Chat answers you** — it is a deliberately separate surface from Enhance.

Next.js 15 App Router · TypeScript strict · Tailwind · Zod · IndexedDB · streaming

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

`lib/client.ts` also accepts the shorthand aliases `BASE_URL` / `API_KEY`. A bare host is fine — `/v1` is appended automatically.

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

The app is two co-equal products, switched from the header (**Enhance | Chat**).

| Route | What it does |
|---|---|
| `/` | **Enhance** — describe a task; get an improved prompt. Defaults to a simple, one-button flow with an **Advanced options** disclosure for models, effort modes, fine-tuning, testing, and optimization. |
| `/chat` | **Chat** — streaming multimodal assistant: text, image understanding, image generation, and voice in/out. Conversations persist locally. |
| `/library` | Reusable prompt scaffolds per category; load one into Enhance |
| `/history` | Every enhancement saved locally in IndexedDB — search, favorite, re-run, delete |
| `/settings` | Theme, default category, per-category rewriter overrides, options, endpoint status, full model-registry reference |
| `/login` | Access gate page (only active when `APP_ACCESS_PASSWORD` is set) |

---

## Enhance

Simple mode is the default: one prompt box, automatic task-type detection, a single **Improve my prompt** button, and a clean result with a plain "what changed" summary. **Advanced options** reveals the full toolkit:

- **Task type** — plain-language categories (Everyday, Research, Image & audio, Medical, Coding, Automation, Image generation), each with a recommended rewriter. Auto-detect classifies your prompt for you.
- **Effort** — *Quick* (one pass), *Compare models* (several rewriters merged by a judge), or *Self-improve* (one model critiques and improves itself over rounds).
- **Model + Optimized-for** — pick the rewriter and, where relevant, the model you'll paste into.
- **Fine-tune** — how much to change, length, tone, keep-wording, and optional alternatives.
- **Find the best version** — generates several rewrites, tests each on a real model, and keeps the empirical winner.
- **Test the difference** — runs your original and improved prompt against a real model and has a judge score which answer is better. This and *Find the best version* are the only Enhance surfaces that run a prompt, and both live entirely outside the rewriter path.

---

## Chat

An everyday assistant grouped by capability in the model picker:

- **Text** — streaming Markdown responses with code-copy, from general / code / medical text models.
- **Vision** — attach images to any image-input model (they show "sees images" in the picker).
- **Image generation** — pick a FLUX model and the composer switches to describe-and-generate; images render inline with download.
- **Voice** — record a message (Whisper transcription into the composer) and read any answer aloud (Kokoro text-to-speech). Each modality is capability-gated to the models the registry ships and degrades gracefully if the endpoint doesn't support it.

**Improve with PromptForge** in the composer hands your draft to Enhance. Conversations are stored in IndexedDB (`conversations` store).

---

## API routes

| Route | Method | Description |
|---|---|---|
| `/api/enhance` | `POST` | Core rewrite endpoint — quick, self-improve, or compare-models mode |
| `/api/classify` | `POST` | Auto-detect: classify a raw prompt into a task type |
| `/api/eval` | `POST` | Test the difference — run original vs improved and judge the outputs |
| `/api/optimize` | `POST` | Find the best version — generate, test, and rank N candidate rewrites |
| `/api/chat` | `POST` | **Chat** — streaming text/vision assistant (answers the user) |
| `/api/image` | `POST` | Text-to-image generation (FLUX) |
| `/api/transcribe` | `POST` | Speech-to-text (Whisper); multipart audio upload |
| `/api/speech` | `POST` | Text-to-speech (Kokoro); returns audio bytes |
| `/api/health` | `GET` | Endpoint connectivity check |
| `/api/models` | `GET` | Full model registry as JSON |
| `/api/auth` | `POST` | Session login (only active when `APP_ACCESS_PASSWORD` is set) |

---

## Guardrails

- **Enhance never answers.** Every meta-prompt carries the "rewrite, don't answer" clause (`lib/meta-prompt.ts`), verified by unit tests. Chat is the separate, sanctioned answering surface; the two paths never mix.
- **Rewriters are text-only.** Image / TTS / ASR / embedding models are selectable as *targets* or Chat models, never as rewriters (`lib/registry.ts`, enforced at the API boundary).
- **Model allowlisting.** Chat, image, speech, and transcription routes each validate the model against a registry pool, so no route can become an open proxy to arbitrary backend model names.
- **Zod validation everywhere.** All model JSON output is validated before rendering; a parse failure retries once with a stricter instruction, then surfaces a clean error.
- **Medical framing only.** The `medical` category rewrites clinical framing; it never injects facts, values, or history the user didn't provide, and always keeps a non-diagnostic directive.
- **Endpoint hygiene.** The base URL, key, and backend model `path` are server-only and never reach the client, logs, or error messages.
- **Access gate.** Set `APP_ACCESS_PASSWORD` in production; every route (pages + API) requires a session cookie. The login page and `/api/auth` are excluded.

---

## Project structure

```
app/
  page.tsx                  # Enhance
  chat/                     # Chat
  layout.tsx                # Root layout + theme init
  login/                    # Access gate page
  history/ library/         # Secondary pages
  settings/                 # Settings + model registry reference
  api/
    enhance/ classify/      # Rewrite + auto-detect
    eval/ optimize/         # Test + optimize (isolated from the rewriter)
    chat/ image/            # Chat streaming + image generation
    transcribe/ speech/     # Voice in (Whisper) + out (Kokoro)
    health/ models/ auth/

components/
  AppShell                  # Enhance | Chat product switch + chrome
  ForgeWorkbench            # Enhance orchestrator (simple + advanced)
  categoryMeta              # Friendly labels / plain descriptions / icons
  CategoryPicker  SimpleCategoryBar
  PromptInput  PromptScore  ModeSelector  ModelPicker  KnobPanel
  ForgeButton  EnhancedOutput  ProvingGround  OptimizeLab
  chat/
    ChatView                # Chat orchestrator (streaming, persistence)
    Composer                # Text + attach + mic + generate
    MessageBubble  Markdown  ChatModelPicker  ConversationSidebar
  ThemeToggle  Wordmark  ConnectivityDot  controls

lib/
  categories.ts             # CategoryDef data + CATEGORY_ORDER
  registry.ts               # Model registry + capability routing
  client.ts                 # All LLM call implementations (server-only)
  schema.ts                 # Zod schemas for every API boundary
  lint.ts  meta-prompt.ts   # Prompt linter + meta-prompt builder
  storage.ts                # IndexedDB history + conversations, settings
  auth.ts                   # Session token helpers
  diff.ts  format.ts  tokens.ts  templates.ts

middleware.ts               # Route-level access gate
```
