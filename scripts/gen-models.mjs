// Regenerates data/models.json from the two provider sources:
//   1. data/navigator-models.json  - the hand-maintained Navigator fleet
//      (the priced source spreadsheet is no longer available, so this file is
//      the checked-in base; edit it directly to change Navigator entries).
//   2. openrouter-models.csv       - the OpenRouter export at the repo root,
//      filtered through the curation tables below.
// Run: pnpm gen:models

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const navigatorSrc = join(__dirname, "..", "data", "navigator-models.json");
const openrouterSrc = join(__dirname, "..", "openrouter-models.csv");
const outDir = join(__dirname, "..", "data");
const out = join(outDir, "models.json");

// Minimal RFC-4180 CSV parser: handles quoted fields with embedded commas.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c === "\r") {
      // ignore; handled by \n
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

// Models in the OpenRouter export that are deliberately NOT shipped. Every
// exclusion needs a reason so a future regeneration does not silently re-add
// them. Do not remove entries here without revisiting the reason.
const EXCLUDED = new Map([
  [
    "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    "Marketed as an uncensored (safety-stripped) model. PromptForge Chat is a public answering surface; this model is excluded on purpose, not by oversight.",
  ],
  [
    "nvidia/nemotron-3.5-content-safety:free",
    "A moderation classifier, not an assistant. It would answer chats with safety labels. Could later back a server-side moderation gate, but it is not user-facing.",
  ],
  [
    "google/lyria-3-pro-preview",
    "Outputs audio (music) through chat-completion modalities that client.ts has no playback path for. Revisit if an audio-output pipeline is added.",
  ],
  [
    "google/lyria-3-clip-preview",
    "Same as lyria-3-pro-preview: audio output with no compatible client path.",
  ],
]);

// Curated metadata per included OpenRouter id. The CSV only carries modality
// and context data, so category / size / architecture / copy live here.
// Categories reuse the Navigator vocabulary so every registry filter applies
// unchanged (Code models stay targets-only and never become rewriters).
const CURATED = {
  "tencent/hy3:free": {
    name: "Hy3",
    category: "General LLM",
    architecture: "Transformer",
    size: "Undisclosed",
    primaryUseCases: "Chat, Reasoning, Long-Context Tasks",
    bestFor: "Free 256K-context generalist from Tencent",
  },
  "poolside/laguna-xs-2.1:free": {
    name: "Laguna XS 2.1",
    category: "Code",
    architecture: "Code-Specialized Transformer",
    size: "Undisclosed",
    primaryUseCases: "Code Generation, Completion, Refactoring",
    bestFor: "Compact Poolside code specialist; free coding target",
  },
  "poolside/laguna-m.1:free": {
    name: "Laguna M.1",
    category: "Code",
    architecture: "Code-Specialized Transformer",
    size: "Undisclosed",
    primaryUseCases: "Code Generation, Review, Multi-File Reasoning",
    bestFor: "Mid-size Poolside code specialist; free coding target",
  },
  "cohere/north-mini-code:free": {
    name: "North Mini Code",
    category: "Code",
    architecture: "Code-Specialized Transformer",
    size: "Undisclosed",
    primaryUseCases: "Code Generation, Completion, Code Review",
    bestFor: "Cohere code specialist with a 256K window; free coding target",
  },
  "qwen/qwen3-coder:free": {
    name: "Qwen3 Coder 480B",
    category: "Code",
    architecture: "MoE (Mixture of Experts)",
    size: "480B total / 35B active",
    primaryUseCases: "Code Generation, Agentic Coding, Repository-Scale Reasoning",
    bestFor: "Largest free code model: 480B MoE code specialist",
  },
  "nvidia/nemotron-3-ultra-550b-a55b:free": {
    name: "Nemotron 3 Ultra 550B",
    category: "General LLM",
    architecture: "MoE (Mixture of Experts)",
    size: "550B total / 55B active",
    primaryUseCases: "Complex Reasoning, STEM, Agentic Workflows, Long-Context Analysis",
    bestFor: "Largest free reasoning model in the registry; 1M-token context",
  },
  "nvidia/nemotron-3-super-120b-a12b:free": {
    name: "Nemotron 3 Super 120B",
    category: "General LLM",
    architecture: "MoE (Mixture of Experts)",
    size: "120B total / 12B active",
    primaryUseCases: "Complex Reasoning, STEM, Agentic Workflows, Long-form Generation",
    bestFor: "Free tier of the registry's best value-for-quality MoE",
  },
  "nvidia/nemotron-3-nano-30b-a3b:free": {
    name: "Nemotron 3 Nano 30B",
    category: "General LLM",
    architecture: "MoE (Mixture of Experts)",
    size: "30B total / 3B active",
    primaryUseCases: "Efficient Reasoning, STEM, Instruction Following",
    bestFor: "Free efficient MoE; good fast rewriter and classifier",
  },
  "nvidia/nemotron-nano-9b-v2:free": {
    name: "Nemotron Nano 9B V2",
    category: "General LLM",
    architecture: "Dense Transformer",
    size: "9B",
    primaryUseCases: "Fast Chat, Lightweight Agents, High-Volume Batch",
    bestFor: "Small free model for quick, low-stakes tasks",
  },
  "nvidia/nemotron-nano-12b-v2-vl:free": {
    name: "Nemotron Nano 12B VL",
    category: "General LLM",
    architecture: "Dense Transformer (Multimodal)",
    size: "12B",
    primaryUseCases: "Vision Chat, Image Analysis, Video Understanding",
    bestFor: "Free compact vision-language model",
  },
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free": {
    name: "Nemotron 3 Nano Omni",
    category: "General LLM",
    architecture: "MoE (Mixture of Experts, Multimodal)",
    size: "30B total / 3B active",
    primaryUseCases: "Multimodal Chat, Video Understanding, Audio Tasks, Reasoning",
    bestFor: "Free omni-input model: text, image, audio, and video in",
  },
  "google/gemma-4-26b-a4b-it:free": {
    name: "Gemma 4 26B A4B",
    category: "General LLM",
    architecture: "MoE (Mixture of Experts, Multimodal)",
    size: "26B total / 4B active",
    primaryUseCases: "Multimodal Chat, Image Analysis, Video Understanding",
    bestFor: "Free multimodal MoE; image and video input at no cost",
  },
  "google/gemma-4-31b-it:free": {
    name: "Gemma 4 31B",
    category: "General LLM",
    architecture: "Dense Transformer (Multimodal)",
    size: "31B",
    primaryUseCases: "Multimodal Chat, Video Understanding, Image Analysis",
    bestFor: "Free tier of the multimodal default; image and video input",
  },
  "qwen/qwen3-next-80b-a3b-instruct:free": {
    name: "Qwen3 Next 80B A3B",
    category: "General LLM",
    architecture: "MoE (Mixture of Experts)",
    size: "80B total / 3B active",
    primaryUseCases: "Chat, Reasoning, Instruction Following, Long-Context Tasks",
    bestFor: "Free 80B MoE generalist with a 256K window",
  },
  "openai/gpt-oss-20b:free": {
    name: "gpt-oss-20b",
    category: "General LLM",
    architecture: "MoE (Mixture of Experts)",
    size: "21B total / 3.6B active",
    primaryUseCases: "High-Volume Chat, Classification, Cost-Sensitive Production",
    bestFor: "Free tier of the cheapest Navigator LLM; ideal classifier",
  },
  "meta-llama/llama-3.3-70b-instruct:free": {
    name: "Llama 3.3 70B",
    category: "General LLM",
    architecture: "Dense Transformer",
    size: "70B",
    primaryUseCases: "Chat, Reasoning, Instruction Following, Summarization, RAG",
    bestFor: "Free tier of the Meta 70B flagship",
  },
  "meta-llama/llama-3.2-3b-instruct:free": {
    name: "Llama 3.2 3B",
    category: "General LLM",
    architecture: "Dense Transformer",
    size: "3B",
    primaryUseCases: "Fast Chat, Edge-Class Tasks, High-Volume Batch",
    bestFor: "Smallest free model; fastest responses for simple asks",
  },
  "nousresearch/hermes-3-llama-3.1-405b:free": {
    name: "Hermes 3 405B",
    category: "General LLM",
    architecture: "Dense Transformer",
    size: "405B",
    primaryUseCases: "Chat, Reasoning, Creative Writing, Long-form Generation",
    bestFor: "Free 405B-class generalist; strongest dense free model",
  },
};

// "262144" -> "256K tokens", "1000000" -> "1M tokens".
function formatContext(n) {
  if (!Number.isFinite(n) || n <= 0) return "N/A";
  const k = n % 1024 === 0 ? n / 1024 : Math.round(n / 1000);
  if (k >= 1000) return `${Math.round(k / 1024) || 1}M tokens`;
  return `${k}K tokens`;
}

// "text,audio,image,video" -> ["Text", "Audio", "Image", "Video"] in the
// registry's fixed order.
const MODALITY_ORDER = ["Text", "Image", "Video", "Audio"];
function formatModalities(csvValue) {
  const set = new Set(
    String(csvValue ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .map((s) => s[0].toUpperCase() + s.slice(1)),
  );
  return MODALITY_ORDER.filter((m) => set.has(m));
}

function buildOpenRouterModels() {
  const raw = readFileSync(openrouterSrc, "utf8");
  const [header, ...dataRows] = parseCsv(raw);
  const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]));
  const col = (row, name) => (row[idx[name]] ?? "").trim();

  const models = [];
  for (const row of dataRows) {
    const id = col(row, "id");
    if (!id) continue;
    if (EXCLUDED.has(id)) continue;
    const meta = CURATED[id];
    if (!meta) {
      // A new export row with no curation entry: skip loudly rather than guess
      // a category (a wrong category could make a non-LLM a rewriter).
      console.warn(`[gen-models] skipping uncurated OpenRouter model: ${id}`);
      continue;
    }
    const ctx = Number(col(row, "top_provider_context_length")) || Number(col(row, "context_length"));
    const isFree = id.endsWith(":free");
    models.push({
      id,
      name: meta.name,
      // :free variants bill nothing; non-free OpenRouter entries would need
      // real prices before inclusion (none are curated in today).
      costInput: isFree ? 0 : null,
      costOutput: isFree ? 0 : null,
      category: meta.category,
      architecture: meta.architecture,
      size: meta.size,
      inputModalities: formatModalities(col(row, "architecture_input_modalities")),
      outputModalities: formatModalities(col(row, "architecture_output_modalities")),
      contextWindow: formatContext(ctx),
      primaryUseCases: meta.primaryUseCases,
      bestFor: meta.bestFor,
      source: "openrouter",
    });
  }
  return models;
}

const navigator = JSON.parse(readFileSync(navigatorSrc, "utf8"));
const openrouter = buildOpenRouterModels();

const ids = new Set();
for (const m of [...navigator, ...openrouter]) {
  if (ids.has(m.id)) throw new Error(`Duplicate model id: ${m.id}`);
  ids.add(m.id);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(out, JSON.stringify([...navigator, ...openrouter], null, 2) + "\n");
console.log(
  `Wrote ${navigator.length} navigator + ${openrouter.length} openrouter models to data/models.json`,
);
