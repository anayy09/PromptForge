"use client";

import { useMemo, useState } from "react";
import type { EnhanceResponse } from "@/lib/schema";
import { diffWords, diffStats } from "@/lib/diff";
import { formatCost, formatTokens } from "@/lib/format";
import { useCopy } from "./useCopy";

type Tab = "prompt" | "diff" | "changes" | "assumptions" | "variants";

export function EnhancedOutput({
  result,
  rawPrompt,
  loading,
  error,
  favorite,
  onToggleFavorite,
  onReforge,
}: {
  result: EnhanceResponse | null;
  rawPrompt: string;
  loading: boolean;
  error: string | null;
  favorite: boolean;
  onToggleFavorite: () => void;
  onReforge: () => void;
}) {
  const [tab, setTab] = useState<Tab>("prompt");
  const { copied, copy } = useCopy();

  const diff = useMemo(
    () => (result ? diffWords(rawPrompt, result.enhancedPrompt) : []),
    [result, rawPrompt],
  );
  const stats = useMemo(() => diffStats(diff), [diff]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onReforge={onReforge} />;
  if (!result) return <EmptyState />;

  const tabs: { id: Tab; label: string; count?: number; show: boolean }[] = [
    { id: "prompt", label: "Prompt", show: true },
    { id: "diff", label: `Diff +${stats.added}/-${stats.removed}`, show: true },
    { id: "changes", label: "Changes", count: result.changes.length, show: result.changes.length > 0 },
    {
      id: "assumptions",
      label: "Assumptions",
      count: result.assumptions.length,
      show: result.assumptions.length > 0,
    },
    {
      id: "variants",
      label: "Variants",
      count: result.variants?.length ?? 0,
      show: (result.variants?.length ?? 0) > 0,
    },
  ];
  const activeTab = tabs.find((t) => t.id === tab && t.show) ? tab : "prompt";

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded border border-hairline bg-surface animate-rise-in">
      {/* header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-hairline px-3.5 py-2.5">
        <span className="text-2xs uppercase tracking-[0.2em] text-ink">
          <span className="bracket">[</span> Forged prompt <span className="bracket">]</span>
        </span>
        <span className="ml-auto flex items-center gap-3 text-2xs tabular-nums text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-ember" />
            {result.model.name}
          </span>
          {result.usage && (
            <span title="prompt / completion tokens">
              {formatTokens(result.usage.promptTokens)}→{formatTokens(result.usage.completionTokens)} tok
            </span>
          )}
          <span
            className={result.costApproximate ? "text-faint" : "text-ink-soft"}
            title={result.costApproximate ? "estimated (no usage returned)" : "actual cost"}
          >
            {formatCost(result.cost, result.costApproximate)}
          </span>
        </span>
      </div>

      {/* tab strip */}
      <div className="flex items-center gap-0.5 overflow-x-auto border-b border-hairline px-2 py-1.5">
        {tabs
          .filter((t) => t.show)
          .map((t) => {
            const active = t.id === activeTab;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`whitespace-nowrap rounded-sm px-2.5 py-1 text-2xs font-medium transition-colors ${
                  active ? "bg-ember/12 text-ember" : "text-muted hover:text-ink"
                }`}
              >
                {t.label}
                {typeof t.count === "number" && t.id !== "diff" ? ` (${t.count})` : ""}
              </button>
            );
          })}
      </div>

      {/* body */}
      <div className="min-h-[220px] flex-1 overflow-auto p-3.5">
        {activeTab === "prompt" && (
          <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-ink">
            {result.enhancedPrompt}
          </pre>
        )}

        {activeTab === "diff" && (
          <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed">
            {diff.map((op, i) => (
              <span
                key={i}
                className={
                  op.type === "add"
                    ? "rounded-sm bg-quench/20 text-ink underline decoration-quench/60 decoration-1 underline-offset-2"
                    : op.type === "del"
                      ? "text-faint line-through decoration-danger/50"
                      : "text-ink-soft"
                }
              >
                {op.text}
              </span>
            ))}
          </pre>
        )}

        {activeTab === "changes" && (
          <ul className="flex flex-col gap-2.5">
            {result.changes.map((c, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="bracket mt-px shrink-0 text-xs">[+]</span>
                <span className="text-sm leading-relaxed">
                  <span className="text-ink">{c.what}</span>
                  <span className="text-muted"> — {c.why}</span>
                </span>
              </li>
            ))}
          </ul>
        )}

        {activeTab === "assumptions" && (
          <ul className="flex flex-col gap-2">
            {result.assumptions.map((a, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-soft">
                <span className="mt-px shrink-0 text-steel">[?]</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        )}

        {activeTab === "variants" && (
          <ul className="flex flex-col gap-3">
            {result.variants?.map((v, i) => (
              <VariantRow key={i} index={i} text={v} />
            ))}
          </ul>
        )}
      </div>

      {/* actions */}
      <div className="flex items-center gap-2 border-t border-hairline px-3 py-2.5">
        <button
          onClick={() => copy(result.enhancedPrompt)}
          className="rounded border border-ember-strong bg-ember px-3 py-1.5 text-xs font-semibold text-on-ember transition-colors hover:bg-ember-strong"
        >
          {copied ? "✓ Copied" : "Copy prompt"}
        </button>
        <button
          onClick={() =>
            copy(
              [
                result.enhancedPrompt,
                "",
                "## Changes",
                ...result.changes.map((c) => `- ${c.what} — ${c.why}`),
              ].join("\n"),
            )
          }
          className="rounded border border-hairline bg-surface px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-hairline-strong hover:text-ink"
        >
          Copy + notes
        </button>
        <button
          onClick={onToggleFavorite}
          title={favorite ? "Unfavorite" : "Save to favorites"}
          className={`ml-auto rounded border px-2.5 py-1.5 text-xs transition-colors ${
            favorite
              ? "border-ember bg-ember/10 text-ember"
              : "border-hairline bg-surface text-muted hover:text-ink"
          }`}
        >
          {favorite ? "★ Saved" : "☆ Save"}
        </button>
        <button
          onClick={onReforge}
          title="Forge again"
          className="rounded border border-hairline bg-surface px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-ink"
        >
          ↻ Re-forge
        </button>
      </div>
    </div>
  );
}

function VariantRow({ index, text }: { index: number; text: string }) {
  const { copied, copy } = useCopy();
  return (
    <li className="rounded border border-hairline bg-canvas">
      <div className="flex items-center justify-between border-b border-hairline px-2.5 py-1.5">
        <span className="text-2xs uppercase tracking-[0.18em] text-muted">
          Variant {String.fromCharCode(65 + index)}
        </span>
        <button
          onClick={() => copy(text)}
          className="text-2xs text-ember hover:underline"
        >
          {copied ? "✓ copied" : "copy"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap break-words px-2.5 py-2 font-mono text-xs leading-relaxed text-ink-soft">
        {text}
      </pre>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded border border-dashed border-hairline-strong/60 bg-surface/40 p-8 text-center">
      <div className="forge-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">
        <div className="mb-3 font-mono text-2xl text-ember">◆</div>
        <p className="text-sm text-ink-soft">The anvil is cold.</p>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted">
          Paste a rough prompt, pick a category, and forge it. The rewrite lands here with a
          full diff and a changes ledger.
        </p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded border border-hairline bg-surface">
      <div className="flex items-center gap-2 border-b border-hairline px-3.5 py-2.5 text-2xs uppercase tracking-[0.2em] text-muted">
        <span className="animate-ember-pulse text-ember">◆</span> Heating the forge
      </div>
      <div className="flex-1 space-y-2.5 p-4">
        {[92, 78, 85, 64, 88, 72, 40].map((w, i) => (
          <div
            key={i}
            className="h-3 animate-ember-pulse rounded-sm bg-surface-2"
            style={{ width: `${w}%`, animationDelay: `${i * 90}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message, onReforge }: { message: string; onReforge: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded border border-danger/40 bg-danger/[0.06] p-8 text-center">
      <div className="mb-2 font-mono text-xl text-danger">[ ! ]</div>
      <p className="text-sm text-ink">{message}</p>
      <button
        onClick={onReforge}
        className="mt-4 rounded border border-hairline bg-surface px-3 py-1.5 text-xs text-ink-soft hover:border-hairline-strong hover:text-ink"
      >
        ↻ Try again
      </button>
    </div>
  );
}
