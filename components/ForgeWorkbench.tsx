"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CategoryPicker } from "./CategoryPicker";
import { PromptInput } from "./PromptInput";
import { ModelPicker } from "./ModelPicker";
import { KnobPanel } from "./KnobPanel";
import { ForgeButton } from "./ForgeButton";
import { EnhancedOutput } from "./EnhancedOutput";
import { useSettings } from "./providers";
import { CATEGORIES } from "@/lib/categories";
import { costFor, getById, type AppCategory } from "@/lib/registry";
import { estimateTokens } from "@/lib/tokens";
import { formatCost } from "@/lib/format";
import type { EnhanceResponse, Knobs } from "@/lib/schema";
import { newId, patchEntry, saveHistory, type HistoryEntry } from "@/lib/storage";
import { slugTitle } from "@/lib/format";

const LOAD_KEY = "promptforge.load";

export function ForgeWorkbench() {
  const { settings, hydrated } = useSettings();

  const [category, setCategory] = useState<AppCategory>("coding");
  const [rawPrompt, setRawPrompt] = useState("");
  const [rewriterId, setRewriterId] = useState(CATEGORIES.coding.defaultRewriterId);
  const [targetId, setTargetId] = useState("");
  const [knobs, setKnobs] = useState<Knobs>({ preserveWording: true });
  const [variants, setVariants] = useState(false);

  const [result, setResult] = useState<EnhanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(false);

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
        if (parsed.category) cat = parsed.category;
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
    setRewriterId(settings.rewriterOverrides[cat] ?? CATEGORIES[cat].defaultRewriterId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const onCategory = (c: AppCategory) => {
    setCategory(c);
    setRewriterId(settings.rewriterOverrides[c] ?? CATEGORIES[c].defaultRewriterId);
    setTargetId("");
  };

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
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Enhancement failed.");
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
      setError("Network error. Is the dev server running?");
    } finally {
      setLoading(false);
    }
  }, [rawPrompt, category, rewriterId, targetId, knobs, variants, loading]);

  const toggleFavorite = () => {
    if (!entryId) return;
    const next = !favorite;
    setFavorite(next);
    patchEntry(entryId, { favorite: next }).catch(() => {});
  };

  // Rough pre-call cost preview.
  const estIn = estimateTokens(rawPrompt) + 260;
  const estOut = Math.min(900, Math.max(120, Math.round(estimateTokens(rawPrompt) * 1.4)));
  const estCost = formatCost(costFor(rewriterId, estIn, estOut), true);

  const cat = CATEGORIES[category];

  return (
    <div className="flex flex-col gap-4">
      <section className="panel rounded p-3.5">
        <CategoryPicker value={category} onChange={onCategory} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Ore side */}
        <div className="flex flex-col gap-3">
          <section className="panel flex flex-1 flex-col rounded p-3.5">
            <PromptInput
              value={rawPrompt}
              onChange={setRawPrompt}
              onForge={forge}
              starters={cat.starters}
              disabled={loading}
            />
          </section>

          <ModelPicker
            category={category}
            rewriterId={rewriterId}
            targetId={targetId}
            onRewriter={setRewriterId}
            onTarget={setTargetId}
          />

          <KnobPanel
            knobs={knobs}
            onChange={(patch) => setKnobs((k) => ({ ...k, ...patch }))}
            variants={variants}
            onVariants={setVariants}
          />

          <ForgeButton
            onClick={forge}
            loading={loading}
            disabled={!rawPrompt.trim()}
            estCost={estCost}
          />
        </div>

        {/* Forged side */}
        <div className="flex min-h-[420px] flex-col">
          <EnhancedOutput
            result={result}
            rawPrompt={rawPrompt}
            loading={loading}
            error={error}
            favorite={favorite}
            onToggleFavorite={toggleFavorite}
            onReforge={forge}
          />
        </div>
      </div>
    </div>
  );
}
