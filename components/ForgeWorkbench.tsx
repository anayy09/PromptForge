"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SlidersHorizontal, ChevronUp } from "lucide-react";
import { CategoryPicker } from "./CategoryPicker";
import { SimpleCategoryBar } from "./SimpleCategoryBar";
import { PromptInput } from "./PromptInput";
import { PromptScore } from "./PromptScore";
import { ProvingGround } from "./ProvingGround";
import { OptimizeLab } from "./OptimizeLab";
import { ModelPicker } from "./ModelPicker";
import { KnobPanel } from "./KnobPanel";
import { ModeSelector } from "./ModeSelector";
import { ForgeButton } from "./ForgeButton";
import { EnhancedOutput } from "./EnhancedOutput";
import { useSettings } from "./providers";
import { useModelAvailability } from "./useModelAvailability";
import { CATEGORIES } from "@/lib/categories";
import { getById, getRewriters, strongestOf, type AppCategory } from "@/lib/registry";
import { estimateTokens } from "@/lib/tokens";
import { lintPrompt } from "@/lib/lint";
import type { ClassifyResponse, EnhanceResponse, ForgeMode, Knobs } from "@/lib/schema";
import { newId, patchEntry, saveHistory, type HistoryEntry } from "@/lib/storage";
import { slugTitle } from "@/lib/format";

const LOAD_KEY = "promptforge.load";

export function ForgeWorkbench() {
  const { settings, hydrated, update } = useSettings();

  const [category, setCategory] = useState<AppCategory>("general");
  const [rawPrompt, setRawPrompt] = useState("");
  const [rewriterId, setRewriterId] = useState(CATEGORIES.general.defaultRewriterId);
  const [targetId, setTargetId] = useState("");
  const [knobs, setKnobs] = useState<Knobs>({ preserveWording: true });
  const [variants, setVariants] = useState(false);
  const [mode, setMode] = useState<ForgeMode>("single");
  const [rounds, setRounds] = useState(2);

  const [result, setResult] = useState<EnhanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(false);

  // Simple-mode auto-detect state.
  const [advanced, setAdvanced] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [autoDetected, setAutoDetected] = useState(false);
  const manualCategory = useRef(false);

  const initialized = useRef(false);

  // Seed from persisted settings once, and honor a pending "load into forge".
  useEffect(() => {
    if (!hydrated || initialized.current) return;
    initialized.current = true;

    let cat = settings.defaultCategory;
    let text = "";
    try {
      const pending = sessionStorage.getItem(LOAD_KEY);
      if (pending) {
        const parsed = JSON.parse(pending) as { rawPrompt?: string; category?: AppCategory };
        if (parsed.category) {
          cat = parsed.category;
          manualCategory.current = true; // a loaded template knows its own type
        }
        if (parsed.rawPrompt) text = parsed.rawPrompt;
        sessionStorage.removeItem(LOAD_KEY);
      }
    } catch {
      /* ignore */
    }

    setCategory(cat);
    setRawPrompt(text);
    setKnobs(settings.knobs);
    setVariants(settings.requestVariants);
    setAdvanced(settings.advancedMode);
    setRewriterId(settings.rewriterOverrides[cat] ?? CATEGORIES[cat].defaultRewriterId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const applyCategory = (c: AppCategory) => {
    setCategory(c);
    setRewriterId(settings.rewriterOverrides[c] ?? CATEGORIES[c].defaultRewriterId);
    setTargetId("");
  };

  // If the seeded rewriter's provider turns out to be unconfigured, move to the
  // override/default when possible, else the strongest available rewriter. The
  // server would fall back anyway; this keeps the picker honest.
  const { sources } = useModelAvailability();
  useEffect(() => {
    if (!sources) return;
    const current = getById(rewriterId);
    if (current && sources.includes(current.source)) return;
    const available = getRewriters().filter((m) => sources.includes(m.source));
    const preferred = [settings.rewriterOverrides[category], CATEGORIES[category].defaultRewriterId];
    const pick =
      preferred.find((id) => id && available.some((m) => m.id === id)) ?? strongestOf(available)?.id;
    if (pick && pick !== rewriterId) setRewriterId(pick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources, rewriterId, category]);

  // Advanced picker + simple dropdown both count as a manual choice: stop auto-detect.
  const onCategory = (c: AppCategory) => {
    manualCategory.current = true;
    setAutoDetected(false);
    applyCategory(c);
  };

  // Background auto-detect for simple mode. Debounced; never overrides a manual
  // pick, and silently no-ops on failure so it can't block the main flow.
  useEffect(() => {
    if (advanced || manualCategory.current) return;
    const text = rawPrompt.trim();
    if (text.length < 15) {
      setAutoDetected(false);
      return;
    }
    let alive = true;
    const t = setTimeout(async () => {
      setDetecting(true);
      try {
        const res = await fetch("/api/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawPrompt: text }),
        });
        if (!res.ok) return;
        const d = (await res.json()) as ClassifyResponse;
        if (!alive || manualCategory.current) return;
        applyCategory(d.category);
        setAutoDetected(true);
      } catch {
        /* silent: detection is a convenience, not a requirement */
      } finally {
        if (alive) setDetecting(false);
      }
    }, 700);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawPrompt, advanced]);

  const forge = useCallback(async () => {
    if (!rawPrompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setEntryId(null);
    setFavorite(false);

    try {
      const res = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawPrompt,
          category,
          rewriterId,
          targetId: targetId || undefined,
          knobs,
          variants,
          mode,
          rounds: mode === "reflexion" ? rounds : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      const enhanced = data as EnhanceResponse;
      setResult(enhanced);

      // Auto-save to history.
      const id = newId();
      const entry: HistoryEntry = {
        id,
        ts: Date.now(),
        category: enhanced.category,
        rawPrompt,
        enhancedPrompt: enhanced.enhancedPrompt,
        changes: enhanced.changes,
        assumptions: enhanced.assumptions,
        variants: enhanced.variants,
        modelId: enhanced.model.id,
        modelName: enhanced.model.name,
        targetName: enhanced.target?.name ?? null,
        cost: enhanced.cost,
        costApproximate: enhanced.costApproximate,
        favorite: false,
        tags: [],
        title: slugTitle(rawPrompt),
      };
      setEntryId(id);
      saveHistory(entry).catch(() => {});
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [rawPrompt, category, rewriterId, targetId, knobs, variants, mode, rounds, loading]);

  const toggleFavorite = () => {
    if (!entryId) return;
    const next = !favorite;
    setFavorite(next);
    patchEntry(entryId, { favorite: next }).catch(() => {});
  };

  const toggleAdvanced = () => {
    const next = !advanced;
    setAdvanced(next);
    update({ advancedMode: next });
  };

  const cat = CATEGORIES[category];
  const rawLint = useMemo(() => lintPrompt(rawPrompt, category), [rawPrompt, category]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Input side */}
        <div className="flex flex-col gap-3">
          <section className="panel flex flex-1 flex-col rounded-xl p-4">
            <PromptInput
              value={rawPrompt}
              onChange={setRawPrompt}
              onForge={forge}
              starters={cat.starters}
              disabled={loading}
            />
            {!advanced && (
              <div className="mt-3 border-t border-hairline pt-3">
                <SimpleCategoryBar
                  value={category}
                  onChange={onCategory}
                  detecting={detecting}
                  wasAutoDetected={autoDetected}
                />
              </div>
            )}
          </section>

          {advanced && (
            <>
              <section className="panel rounded-xl p-4">
                <CategoryPicker value={category} onChange={onCategory} rawPrompt={rawPrompt} />
              </section>
              {rawPrompt.trim().length > 0 && <PromptScore result={rawLint} label="Prompt quality" />}
              <ModelPicker
                category={category}
                rewriterId={rewriterId}
                targetId={targetId}
                onRewriter={setRewriterId}
                onTarget={setTargetId}
              />
              <ModeSelector mode={mode} onMode={setMode} rounds={rounds} onRounds={setRounds} />
              <KnobPanel
                knobs={knobs}
                onChange={(patch) => setKnobs((k) => ({ ...k, ...patch }))}
                variants={variants}
                onVariants={setVariants}
              />
            </>
          )}

          <ForgeButton onClick={forge} loading={loading} disabled={!rawPrompt.trim()} />

          <button
            onClick={toggleAdvanced}
            className="inline-flex items-center justify-center gap-1.5 self-center rounded-full px-3 py-1 text-2xs font-medium text-muted transition-colors hover:text-ink"
          >
            {advanced ? <ChevronUp size={13} aria-hidden /> : <SlidersHorizontal size={13} aria-hidden />}
            {advanced ? "Hide advanced options" : "Advanced options"}
          </button>

          {advanced && (
            <OptimizeLab
              rawPrompt={rawPrompt}
              category={category}
              rewriterId={rewriterId}
              targetId={targetId || undefined}
              onUseWinner={setRawPrompt}
            />
          )}
        </div>

        {/* Result side */}
        <div className="flex min-h-[420px] flex-col gap-3">
          <EnhancedOutput
            result={result}
            rawPrompt={rawPrompt}
            loading={loading}
            error={error}
            favorite={favorite}
            onToggleFavorite={toggleFavorite}
            onReforge={forge}
            simple={!advanced}
          />
          {advanced && result && !loading && (
            <ProvingGround
              rawPrompt={rawPrompt}
              enhancedPrompt={result.enhancedPrompt}
              category={result.category}
              targetId={result.target?.id}
            />
          )}
        </div>
      </div>
    </div>
  );
}
