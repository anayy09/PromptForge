// Regenerates data/models.json from the model registry CSV.
// Run: pnpm gen:models

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, "..", "available-models.csv");
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

// "$0.20 " -> 0.2 ; "-" / "" -> null
const cost = (v) => {
  const cleaned = String(v ?? "").replace(/[$,\s]/g, "");
  if (cleaned === "" || cleaned === "-") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

const list = (v) =>
  v
    ? String(v)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

// The source CSV has a couple of mojibake dashes; normalize to ASCII.
const clean = (v) =>
  String(v ?? "")
    .replace(/�/g, "-")
    .replace(/[‒-―−]/g, "-")
    .trim();

const raw = readFileSync(src, "utf8");
const [header, ...dataRows] = parseCsv(raw);
const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]));

const col = (row, name) => row[idx[name]];

const models = dataRows.map((row) => ({
  id: clean(col(row, "Model Name")),
  uuid: clean(col(row, "Model ID")),
  name: clean(col(row, "Model Name")),
  // "Model Path" (the backend HF slug) is deliberately not emitted: it would be
  // bundled to the client via registry.ts and reveal the endpoint's model
  // identity. The API call keys on `id`, so `path` is unused. Do not re-add it.
  costInput: cost(col(row, "Cost (Input)")),
  costOutput: cost(col(row, "Cost (Output)")),
  category: clean(col(row, "Category")),
  architecture: clean(col(row, "Architecture")),
  size: clean(col(row, "Model Size")),
  inputModalities: list(col(row, "Input Modalities")),
  outputModalities: list(col(row, "Output Modalities")),
  contextWindow: clean(col(row, "Context Window")),
  primaryUseCases: clean(col(row, "Primary Use Cases")),
  bestFor: clean(col(row, "Best For")),
}));

mkdirSync(outDir, { recursive: true });
writeFileSync(out, JSON.stringify(models, null, 2) + "\n");
console.log(`Wrote ${models.length} models to data/models.json`);
