"use client";

import { useState } from "react";
import type { LintResult } from "@/lib/lint";

const GRADE_COLOR: Record<string, string> = {
  weak: "bg-danger",
  fair: "bg-steel",
  strong: "bg-quench",
};
const GRADE_TEXT: Record<string, string> = {
  weak: "text-danger",
  fair: "text-steel",
  strong: "text-quench",
};

/**
 * Compact quality meter for a prompt, driven by the deterministic linter.
 * `delta` (enhanced score minus raw score) is shown on the forged output so the
 * quality lift is visible. Expands to list the checks and their hints.
 */
export function PromptScore({
  result,
  label = "Quality",
  delta,
}: {
  result: LintResult;
  label?: string;
  delta?: number;
}) {
  const [open, setOpen] = useState(false);
  const { score, grade, checks } = result;
  const failing = checks.filter((c) => !c.pass);

  return (
    <div className="rounded border border-hairline bg-surface">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left"
      >
        <span className="text-2xs uppercase tracking-[0.18em] text-muted">{label}</span>
        <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
          <span
            className={`absolute inset-y-0 left-0 rounded-full transition-all ${GRADE_COLOR[grade]}`}
            style={{ width: `${score}%` }}
          />
        </span>
        <span className={`text-2xs font-semibold tabular-nums ${GRADE_TEXT[grade]}`}>{score}</span>
        <span className={`text-2xs ${GRADE_TEXT[grade]}`}>{grade}</span>
        {typeof delta === "number" && delta !== 0 && (
          <span
            className={`text-2xs font-medium tabular-nums ${delta > 0 ? "text-quench" : "text-danger"}`}
            title="change vs. the raw prompt"
          >
            {delta > 0 ? `+${delta}` : delta}
          </span>
        )}
        <span className="text-2xs text-faint">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <ul className="flex flex-col gap-1.5 border-t border-hairline px-3 py-2.5">
          {checks.map((c) => (
            <li key={c.id} className="flex items-start gap-2 text-2xs leading-relaxed">
              <span className={c.pass ? "text-quench" : "text-faint"}>
                {c.pass ? "[x]" : "[ ]"}
              </span>
              <span className={c.pass ? "text-ink-soft" : "text-muted"}>
                <span className={c.pass ? "" : "text-ink-soft"}>{c.label}</span>
                {!c.pass && <span className="text-faint"> — {c.hint}</span>}
              </span>
            </li>
          ))}
          {failing.length === 0 && (
            <li className="text-2xs text-quench">All checks pass.</li>
          )}
        </ul>
      )}
    </div>
  );
}
