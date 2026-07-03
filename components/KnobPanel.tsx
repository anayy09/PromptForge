"use client";

import { useState } from "react";
import { Field, Segmented, Toggle } from "./controls";
import type { Knobs } from "@/lib/schema";

export function KnobPanel({
  knobs,
  onChange,
  variants,
  onVariants,
}: {
  knobs: Knobs;
  onChange: (patch: Partial<Knobs>) => void;
  variants: boolean;
  onVariants: (v: boolean) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded border border-hairline bg-surface">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="text-2xs uppercase tracking-[0.18em] text-muted">
          <span className="bracket">{open ? "[-]" : "[+]"}</span> Knobs
        </span>
        <span className="text-2xs text-faint">
          {knobs.strictness ?? "medium"} · {knobs.verbosity ?? "normal"} ·{" "}
          {knobs.preserveWording ? "preserve" : "free"}
          {variants ? " · +variants" : ""}
        </span>
      </button>

      {open && (
        <div className="grid gap-3 border-t border-hairline px-3 py-3 sm:grid-cols-3">
          <Field label="Strictness">
            <Segmented
              ariaLabel="Strictness"
              value={knobs.strictness ?? "medium"}
              onChange={(v) => onChange({ strictness: v })}
              options={[
                { value: "low", label: "low" },
                { value: "medium", label: "med" },
                { value: "high", label: "high" },
              ]}
            />
          </Field>
          <Field label="Length">
            <Segmented
              ariaLabel="Verbosity"
              value={knobs.verbosity ?? "normal"}
              onChange={(v) => onChange({ verbosity: v })}
              options={[
                { value: "terse", label: "terse" },
                { value: "normal", label: "normal" },
                { value: "detailed", label: "detailed" },
              ]}
            />
          </Field>
          <Field label="Tone">
            <Segmented
              ariaLabel="Tone"
              value={knobs.tone ?? "neutral"}
              onChange={(v) => onChange({ tone: v })}
              options={[
                { value: "neutral", label: "neutral" },
                { value: "formal", label: "formal" },
                { value: "terse", label: "terse" },
              ]}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:col-span-3">
            <Toggle
              checked={knobs.preserveWording ?? false}
              onChange={(v) => onChange({ preserveWording: v })}
              label="Preserve my wording"
            />
            <Toggle
              checked={variants}
              onChange={onVariants}
              label="Generate variants (extra call)"
            />
          </div>
        </div>
      )}
    </div>
  );
}
