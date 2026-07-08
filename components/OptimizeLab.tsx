"use client";

import { useState } from "react";
import type { AppCategory } from "@/lib/registry";
import type { OptimizeResponse, OptimizeCandidate } from "@/lib/schema";
import { formatCost, formatTokens } from "@/lib/format";
import { useCopy } from "./useCopy";

const UNSUPPORTED: AppCategory[] = ["image-gen", "data-viz-multimodal"];

/**
 * Auto-optimize: forge several candidates, run each against the target, and rank
 * them empirically. This runs prompts, so it is separate from the enhancer path
 * (hard rule #2). Off by default; it is the most call-heavy action.
 */
export function OptimizeLab({
  rawPrompt,
  category,
  rewriterId,
  targetId,
  onUseWinner,
}: {
  rawPrompt: string;
  category: AppCategory;
  rewriterId: string;
  targetId?: string;
  onUseWinner: (prompt: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "running">("idle");
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supported = !UNSUPPORTED.includes(category);
  const canRun = supported && rawPrompt.trim().length > 0;

  const run = async () => {
    if (!canRun || state === "running") return;
    setState("running");
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawPrompt, category, rewriterId, targetId: targetId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Optimization failed.");
        return;
      }
      setResult(data as OptimizeResponse);
    } catch {
      setError("Network error.");
    } finally {
      setState("idle");
    }
  };

  return (
    <div className="rounded-xl border border-hairline bg-surface shadow-soft">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left"
      >
        <span className="text-xs font-medium text-muted">Find the best version</span>
        <span className="text-2xs text-faint">tries several, keeps the winner</span>
      </button>

      {open && (
        <div className="border-t border-hairline px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-2xs leading-relaxed text-muted">
              Writes 3 versions, tries each on a real model, and keeps the one that performed best.
            </p>
            <button
              onClick={run}
              disabled={!canRun || state === "running"}
              className="ml-auto rounded-lg bg-ember px-3 py-1.5 text-xs font-semibold text-on-ember shadow-soft transition-colors hover:bg-ember-strong disabled:opacity-40"
            >
              {state === "running" ? "Working…" : "Find best"}
            </button>
          </div>

          {!supported && (
            <p className="mt-2 text-2xs text-muted">
              Not available for image or multimodal categories (no text target to test against).
            </p>
          )}

          {state === "running" && (
            <p className="mt-3 text-xs text-muted">
              <span className="animate-ember-pulse text-ember">◆</span> Forging and testing
              candidates. This runs several models and can take a moment.
            </p>
          )}

          {error && <p className="mt-3 text-xs text-danger">{error}</p>}

          {result && (
            <div className="mt-3 flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center gap-x-3 text-2xs tabular-nums text-muted">
                <span className="text-ink-soft">
                  {result.candidates.length} candidates · target {result.target.name} · judge{" "}
                  {result.judge.name}
                </span>
                <span className="ml-auto">
                  {result.usage &&
                    `${formatTokens(result.usage.promptTokens + result.usage.completionTokens)} tok · `}
                  {formatCost(result.cost, result.costApproximate)}
                </span>
              </div>
              {result.reasoning && (
                <p className="text-2xs leading-relaxed text-ink-soft">
                  <span className="bracket">[=]</span> {result.reasoning}
                </p>
              )}
              <ol className="flex flex-col gap-2">
                {result.candidates.map((c, i) => (
                  <CandidateRow
                    key={i}
                    candidate={c}
                    rank={i}
                    onUse={() => onUseWinner(c.prompt)}
                  />
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CandidateRow({
  candidate,
  rank,
  onUse,
}: {
  candidate: OptimizeCandidate;
  rank: number;
  onUse: () => void;
}) {
  const { copied, copy } = useCopy();
  const winner = rank === 0;
  return (
    <li className={`rounded border bg-canvas ${winner ? "border-quench/50" : "border-hairline"}`}>
      <div className="flex items-center gap-2 border-b border-hairline px-2.5 py-1.5">
        <span className="text-2xs uppercase tracking-[0.18em] text-muted">
          {winner ? "Winner" : `#${rank + 1}`}
        </span>
        <span className="text-2xs font-semibold tabular-nums text-ember">
          {candidate.score.toFixed(1)}/10
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => copy(candidate.prompt)} className="text-2xs text-muted hover:text-ink">
            {copied ? "✓" : "copy"}
          </button>
          <button onClick={onUse} className="text-2xs text-ember hover:underline">
            use
          </button>
        </div>
      </div>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words px-2.5 py-2 font-mono text-2xs leading-relaxed text-ink-soft">
        {candidate.prompt}
      </pre>
    </li>
  );
}
