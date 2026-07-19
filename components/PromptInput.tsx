"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * The Enhance composer card: a borderless auto-growing editor inside one
 * raised surface, with the category control and primary action living in the
 * card's footer (passed in via `footer`). Starters render beneath when empty.
 */
export function PromptInput({
  value,
  onChange,
  onForge,
  starters,
  disabled,
  footer,
}: {
  value: string;
  onChange: (v: string) => void;
  onForge: () => void;
  starters: string[];
  disabled?: boolean;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const empty = value.trim().length === 0;

  // Auto-grow with the content, capped at half the viewport.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    const cap = typeof window !== "undefined" ? window.innerHeight * 0.5 : 480;
    el.style.height = `${Math.min(el.scrollHeight, cap)}px`;
  }, [value]);

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-2xl border border-hairline bg-surface shadow-card transition-all duration-200 focus-within:border-ember/60 focus-within:shadow-lifted">
        <label htmlFor="raw-prompt" className="sr-only">
          Your prompt
        </label>
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
          rows={4}
          className="max-h-[50vh] min-h-[8.5rem] w-full resize-none bg-transparent px-4 pb-2 pt-4 font-mono text-sm leading-relaxed text-ink placeholder:text-faint focus:outline-none"
        />
        {footer && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-hairline/70 px-3 py-2.5">
            {footer}
          </div>
        )}
      </div>

      <div className="flex min-h-6 flex-wrap items-center gap-1.5 px-1">
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
                className="rounded-full border border-hairline bg-surface px-2.5 py-1 text-2xs text-ink-soft transition-all duration-150 hover:-translate-y-px hover:border-ember hover:text-ember active:translate-y-0"
              >
                {s}
              </button>
            ))}
          </>
        ) : (
          <>
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
            <span className="ml-auto text-2xs tabular-nums text-faint">
              {value.length.toLocaleString()} characters
            </span>
          </>
        )}
      </div>
    </div>
  );
}
