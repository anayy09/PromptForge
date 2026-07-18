"use client";

import { useState } from "react";
import type { AppCategory } from "@/lib/registry";
import type { EvalResponse } from "@/lib/schema";
import { formatTokens } from "@/lib/format";

// Categories whose targets are not text models we can run-and-judge here.
const UNSUPPORTED: AppCategory[] = ["image-gen", "data-viz-multimodal"];

/**
 * Proving Ground: the opt-in closed loop. It runs the raw and enhanced prompts
 * against a target model and shows a judge's verdict, so the rewrite is backed
 * by evidence instead of trust. This is separate from the enhancer, which never
 * runs prompts (hard rule #2).
 */
export function ProvingGround({
  rawPrompt,
  enhancedPrompt,
  category,
  targetId,
}: {
  rawPrompt: string;
  enhancedPrompt: string;
  category: AppCategory;
  targetId?: string;
}) {
  const [state, setState] = useState<"idle" | "running">("idle");
  const [result, setResult] = useState<EvalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supported = !UNSUPPORTED.includes(category);

  const run = async () => {
    if (state === "running") return;
    setState("running");
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/eval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawPrompt, enhancedPrompt, category, targetId: targetId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Proving Ground failed.");
        return;
      }
      setResult(data as EvalResponse);
    } catch {
      setError("Network error.");
    } finally {
      setState("idle");
    }
  };

  return (
    <div className="rounded-xl border border-hairline bg-surface shadow-soft">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-hairline px-4 py-3">
        <span className="text-sm font-semibold text-ink">Test the difference</span>
        <span className="text-2xs text-faint">
          runs your original and improved prompt, then scores which answer is better
        </span>
        <button
          onClick={run}
          disabled={!supported || state === "running"}
          className="ml-auto rounded-lg border border-steel bg-steel/[0.08] px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-steel/[0.15] disabled:opacity-40"
        >
          {state === "running" ? "Running…" : result ? "Run again" : "Run test"}
        </button>
      </div>

      <div className="p-3.5">
        {!supported && (
          <p className="text-xs text-muted">
            The Proving Ground supports text targets. Image and multimodal categories are not
            run here.
          </p>
        )}

        {supported && !result && !error && state === "idle" && (
          <p className="text-xs leading-relaxed text-muted">
            Run both prompts against a target model and let a separate judge decide which output
            is better. This is the only place PromptForge executes a prompt.
          </p>
        )}

        {state === "running" && (
          <p className="text-xs text-muted">
            <span className="animate-ember-pulse text-ember">◆</span> Running both prompts and
            judging the outputs...
          </p>
        )}

        {error && <p className="text-xs text-danger">{error}</p>}

        {result && <Verdict result={result} />}
      </div>
    </div>
  );
}

function Verdict({ result }: { result: EvalResponse }) {
  const win = result.winner;
  const banner =
    win === "enhanced"
      ? { text: "Forged prompt won", cls: "border-quench/40 bg-quench/[0.08] text-quench" }
      : win === "raw"
        ? { text: "Raw prompt won", cls: "border-danger/40 bg-danger/[0.06] text-danger" }
        : { text: "Tie", cls: "border-hairline bg-surface-2 text-ink-soft" };

  return (
    <div className="flex flex-col gap-3">
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded border px-3 py-2 ${banner.cls}`}>
        <span className="text-xs font-semibold uppercase tracking-wide">{banner.text}</span>
        <span className="text-2xs tabular-nums opacity-90">
          raw {result.rawScore.toFixed(1)} · forged {result.enhancedScore.toFixed(1)}
        </span>
        <span className="ml-auto text-2xs tabular-nums text-muted">
          {result.target.name} · judged by {result.judge.name}
          {result.usage && ` · ${formatTokens(result.usage.promptTokens + result.usage.completionTokens)} tok`}
        </span>
      </div>

      {result.reasoning && (
        <p className="text-xs leading-relaxed text-ink-soft">
          <span className="bracket">[=]</span> {result.reasoning}
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <OutputColumn title="From raw prompt" text={result.rawOutput} win={win === "raw"} />
        <OutputColumn title="From forged prompt" text={result.enhancedOutput} win={win === "enhanced"} />
      </div>
    </div>
  );
}

function OutputColumn({ title, text, win }: { title: string; text: string; win: boolean }) {
  return (
    <div className={`rounded border bg-canvas ${win ? "border-quench/50" : "border-hairline"}`}>
      <div className="flex items-center justify-between border-b border-hairline px-2.5 py-1.5">
        <span className="text-2xs uppercase tracking-[0.18em] text-muted">{title}</span>
        {win && <span className="text-2xs text-quench">winner</span>}
      </div>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words px-2.5 py-2 font-mono text-2xs leading-relaxed text-ink-soft">
        {text || "(empty response)"}
      </pre>
    </div>
  );
}
