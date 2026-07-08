"use client";

import { useRef } from "react";

export function PromptInput({
  value,
  onChange,
  onForge,
  starters,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onForge: () => void;
  starters: string[];
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const chars = value.length;
  const empty = value.trim().length === 0;

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor="raw-prompt" className="text-xs font-medium text-muted">
          Your prompt
        </label>
        <span className="text-2xs tabular-nums text-faint">
          {chars.toLocaleString()} characters
        </span>
      </div>

      <textarea
        id="raw-prompt"
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            onForge();
          }
        }}
        placeholder="Describe what you want the AI to do. For example: write a friendly email asking my landlord to fix the heating."
        spellCheck={false}
        suppressHydrationWarning
        className="min-h-[220px] flex-1 resize-y rounded-lg border border-hairline bg-sunken px-3.5 py-3 font-mono text-sm leading-relaxed text-ink placeholder:text-faint focus:border-ember focus:bg-canvas focus:outline-none"
      />

      <div className="mt-2 flex min-h-[26px] flex-wrap items-center gap-1.5">
        {empty ? (
          <>
            <span className="text-2xs text-faint">Try one:</span>
            {starters.map((s) => (
              <button
                key={s}
                onClick={() => {
                  onChange(s);
                  ref.current?.focus();
                }}
                className="rounded-full border border-hairline bg-surface px-2.5 py-1 text-2xs text-ink-soft transition-colors hover:border-ember hover:text-ember"
              >
                {s}
              </button>
            ))}
          </>
        ) : (
          <button
            onClick={() => {
              onChange("");
              ref.current?.focus();
            }}
            disabled={disabled}
            className="text-2xs text-muted underline-offset-2 hover:text-danger hover:underline disabled:opacity-50"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-2xs text-faint">
          <kbd className="rounded border border-hairline bg-surface px-1 py-0.5 font-mono">
            ⌘⏎
          </kbd>{" "}
          to run
        </span>
      </div>
    </div>
  );
}
