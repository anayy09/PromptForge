"use client";

import { useMemo, useState } from "react";
import { Copy, Check, Star, RefreshCw, Wand2, AlertTriangle } from "lucide-react";
import type { EnhanceResponse, ForgeMethod } from "@/lib/schema";
import { diffWords, diffStats } from "@/lib/diff";
import { lintPrompt } from "@/lib/lint";
import { formatTokens } from "@/lib/format";
import { PromptScore } from "./PromptScore";
import { useCopy } from "./useCopy";

type Tab = "prompt" | "diff" | "changes" | "assumptions" | "variants" | "method";

export function EnhancedOutput({
  result,
  rawPrompt,
  loading,
  error,
  favorite,
  onToggleFavorite,
  onReforge,
  simple = false,
}: {
  result: EnhanceResponse | null;
  rawPrompt: string;
  loading: boolean;
  error: string | null;
  favorite: boolean;
  onToggleFavorite: () => void;
  onReforge: () => void;
  /** Simple view: lead with the result + a plain "what changed" list, no tabs. */
  simple?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("prompt");
  const { copied, copy } = useCopy();

  const diff = useMemo(
    () => (result ? diffWords(rawPrompt, result.enhancedPrompt) : []),
    [result, rawPrompt],
  );
  const stats = useMemo(() => diffStats(diff), [diff]);

  // Before/after linter scores, so the quality lift is visible on the output.
  const enhancedLint = useMemo(
    () => (result ? lintPrompt(result.enhancedPrompt, result.category) : null),
    [result],
  );
  const rawScore = useMemo(
    () => (result ? lintPrompt(rawPrompt, result.category).score : 0),
    [result, rawPrompt],
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onReforge={onReforge} />;
  if (!result) return <EmptyState />;

  const copyActions = (
    <div className="flex items-center gap-2 border-t border-hairline px-3 py-2.5">
      <button
        onClick={() => copy(result.enhancedPrompt)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-ember px-3 py-1.5 text-xs font-semibold text-on-ember shadow-soft transition-colors hover:bg-ember-strong"
      >
        {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
        {copied ? "Copied" : "Copy prompt"}
      </button>
      <button
        onClick={() =>
          copy(
            [
              result.enhancedPrompt,
              "",
              "## What changed",
              ...result.changes.map((c) => `- ${c.what} — ${c.why}`),
            ].join("\n"),
          )
        }
        className="rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-hairline-strong hover:text-ink"
      >
        Copy with notes
      </button>
      <button
        onClick={onToggleFavorite}
        title={favorite ? "Remove from saved" : "Save this"}
        className={`ml-auto grid h-8 w-8 place-items-center rounded-lg border transition-colors ${
          favorite
            ? "border-ember bg-ember/10 text-ember"
            : "border-hairline bg-surface text-muted hover:text-ink"
        }`}
      >
        <Star size={15} aria-hidden fill={favorite ? "currentColor" : "none"} />
      </button>
      <button
        onClick={onReforge}
        title="Try again"
        className="grid h-8 w-8 place-items-center rounded-lg border border-hairline bg-surface text-muted transition-colors hover:text-ink"
      >
        <RefreshCw size={15} aria-hidden />
      </button>
    </div>
  );

  // -------- Simple view: no tabs, plain "what changed" --------
  if (simple) {
    return (
      <div className="panel flex flex-1 flex-col overflow-hidden rounded-xl animate-rise-in">
        <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
          <Wand2 size={15} className="text-ember" aria-hidden />
          <span className="text-sm font-semibold text-ink">Improved prompt</span>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-ink">
            {result.enhancedPrompt}
          </pre>

          {result.changes.length > 0 && (
            <div className="mt-4 border-t border-hairline pt-3">
              <div className="mb-2 text-xs font-medium text-muted">What changed</div>
              <ul className="flex flex-col gap-2">
                {result.changes.map((c, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed">
                    <Check size={15} className="mt-0.5 shrink-0 text-quench" aria-hidden />
                    <span>
                      <span className="text-ink">{c.what}</span>
                      <span className="text-muted"> — {c.why}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.assumptions.length > 0 && (
            <div className="mt-4 border-t border-hairline pt-3">
              <div className="mb-2 text-xs font-medium text-muted">
                Assumptions it made (check these)
              </div>
              <ul className="flex flex-col gap-1.5">
                {result.assumptions.map((a, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink-soft">
                    <span className="mt-0.5 shrink-0 text-steel">·</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {copyActions}
      </div>
    );
  }

  // -------- Advanced view: full tabbed detail --------
  const tabs: { id: Tab; label: string; count?: number; show: boolean }[] = [
    { id: "prompt", label: "Result", show: true },
    { id: "diff", label: `Diff +${stats.added}/-${stats.removed}`, show: true },
    { id: "changes", label: "What changed", count: result.changes.length, show: result.changes.length > 0 },
    {
      id: "assumptions",
      label: "Assumptions",
      count: result.assumptions.length,
      show: result.assumptions.length > 0,
    },
    {
      id: "variants",
      label: "Alternatives",
      count: result.variants?.length ?? 0,
      show: (result.variants?.length ?? 0) > 0,
    },
    {
      id: "method",
      label: result.method?.mode === "ensemble" ? "How it was made" : "Self-improve rounds",
      show: !!result.method && result.method.mode !== "single",
    },
  ];
  const activeTab = tabs.find((t) => t.id === tab && t.show) ? tab : "prompt";

  return (
    <div className="panel flex flex-1 flex-col overflow-hidden rounded-xl animate-rise-in">
      {/* header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-hairline px-4 py-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
          <Wand2 size={15} className="text-ember" aria-hidden />
          Improved prompt
        </span>
        <span className="ml-auto flex items-center gap-3 text-2xs tabular-nums text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-ember" />
            {modelLabel(result)}
          </span>
          {result.usage && (
            <span title="prompt / completion tokens">
              {formatTokens(result.usage.promptTokens)}→{formatTokens(result.usage.completionTokens)} tok
            </span>
          )}
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
                className={`whitespace-nowrap rounded-full px-2.5 py-1 text-2xs font-medium transition-colors ${
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
      <div className="min-h-[220px] flex-1 overflow-auto p-4">
        {activeTab === "prompt" && (
          <div className="flex flex-col gap-3">
            {enhancedLint && (
              <PromptScore
                result={enhancedLint}
                label="Prompt quality"
                delta={enhancedLint.score - rawScore}
              />
            )}
            <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-ink">
              {result.enhancedPrompt}
            </pre>
          </div>
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
                <Check size={15} className="mt-0.5 shrink-0 text-quench" aria-hidden />
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
                <span className="mt-px shrink-0 text-steel">·</span>
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

        {activeTab === "method" && result.method && <MethodView method={result.method} />}
      </div>

      {copyActions}
    </div>
  );
}

// Header label: friendly model name for single mode, or a compact method summary
// (e.g. "3 models compared", "gpt-oss-120b · self-improved") otherwise.
function modelLabel(result: EnhanceResponse): string {
  const m = result.method;
  if (!m || m.mode === "single") return result.model.name;
  const n = m.contributors?.length ?? 0;
  if (m.mode === "ensemble") return n > 0 ? `${n} models compared` : result.model.name;
  return `${result.model.name} · self-improved`;
}

function MethodView({ method }: { method: ForgeMethod }) {
  if (method.mode === "ensemble") {
    return (
      <div className="flex flex-col gap-3 text-sm">
        <div>
          <div className="mb-1.5 text-2xs uppercase tracking-[0.18em] text-muted">
            Models that contributed
          </div>
          <div className="flex flex-wrap gap-1.5">
            {method.contributors?.map((c) => (
              <span
                key={c.id}
                className="rounded-full border border-hairline bg-canvas px-2.5 py-0.5 text-xs text-ink-soft"
              >
                {c.name}
              </span>
            ))}
          </div>
        </div>
        {method.judge && (
          <div className="text-xs text-muted">
            <span className="text-2xs uppercase tracking-[0.18em]">Merged by</span>{" "}
            <span className="text-ink-soft">{method.judge.name}</span>
          </div>
        )}
        {method.rationale && (
          <p className="text-sm leading-relaxed text-ink-soft">{method.rationale}</p>
        )}
      </div>
    );
  }

  // reflexion
  return (
    <ol className="flex flex-col gap-3">
      {(method.rounds ?? []).map((r, i) => (
        <li key={i} className="rounded-lg border border-hairline bg-canvas p-3">
          <div className="mb-1 text-2xs uppercase tracking-[0.18em] text-muted">
            Round {i + 1} self-critique
          </div>
          <p className="text-sm leading-relaxed text-ink-soft">{r.critique}</p>
        </li>
      ))}
      {(method.rounds?.length ?? 0) === 0 && (
        <li className="text-xs text-muted">No critique rounds were recorded.</li>
      )}
    </ol>
  );
}

function VariantRow({ index, text }: { index: number; text: string }) {
  const { copied, copy } = useCopy();
  return (
    <li className="rounded-lg border border-hairline bg-canvas">
      <div className="flex items-center justify-between border-b border-hairline px-3 py-1.5">
        <span className="text-2xs uppercase tracking-[0.18em] text-muted">
          Alternative {String.fromCharCode(65 + index)}
        </span>
        <button
          onClick={() => copy(text)}
          className="inline-flex items-center gap-1 text-2xs text-ember hover:underline"
        >
          {copied ? <Check size={12} aria-hidden /> : <Copy size={12} aria-hidden />}
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap break-words px-3 py-2 font-mono text-xs leading-relaxed text-ink-soft">
        {text}
      </pre>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-hairline-strong/60 bg-surface/40 p-8 text-center">
      <div className="forge-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative">
        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-ember/10 text-ember">
          <Wand2 size={20} aria-hidden />
        </div>
        <p className="text-sm font-medium text-ink">Your improved prompt appears here</p>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted">
          Type what you want the AI to do, then press Improve. You will get a cleaner prompt you can
          copy anywhere.
        </p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="panel flex flex-1 flex-col overflow-hidden rounded-xl">
      <div className="flex items-center gap-2 border-b border-hairline px-4 py-3 text-sm font-medium text-muted">
        <Wand2 size={15} className="animate-pulse text-ember" aria-hidden /> Improving your prompt…
      </div>
      <div className="flex-1 space-y-2.5 p-4">
        {[92, 78, 85, 64, 88, 72, 40].map((w, i) => (
          <div
            key={i}
            className="h-3 animate-ember-pulse rounded-full bg-surface-2"
            style={{ width: `${w}%`, animationDelay: `${i * 90}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message, onReforge }: { message: string; onReforge: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-danger/40 bg-danger/[0.06] p-8 text-center">
      <AlertTriangle size={22} className="mb-2 text-danger" aria-hidden />
      <p className="text-sm text-ink">{message}</p>
      <button
        onClick={onReforge}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs text-ink-soft hover:border-hairline-strong hover:text-ink"
      >
        <RefreshCw size={14} aria-hidden /> Try again
      </button>
    </div>
  );
}
