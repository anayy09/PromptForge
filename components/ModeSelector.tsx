"use client";

import { Segmented } from "./controls";
import type { ForgeMode } from "@/lib/schema";

const BLURB: Record<ForgeMode, string> = {
  single: "One model, one pass. Fast and cheapest.",
  ensemble: "Several models forge in parallel; a judge merges the strongest rewrite.",
  reflexion: "One model critiques and improves its own rewrite over a few rounds.",
};

export function ModeSelector({
  mode,
  onMode,
  rounds,
  onRounds,
}: {
  mode: ForgeMode;
  onMode: (m: ForgeMode) => void;
  rounds: number;
  onRounds: (r: number) => void;
}) {
  return (
    <div className="rounded border border-hairline bg-surface px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-2xs uppercase tracking-[0.18em] text-muted">
          <span className="bracket">[~]</span> Method
        </span>
        <div className="w-48 sm:w-56">
          <Segmented<ForgeMode>
            ariaLabel="Forge method"
            value={mode}
            onChange={onMode}
            options={[
              { value: "single", label: "single" },
              { value: "ensemble", label: "ensemble" },
              { value: "reflexion", label: "reflexion" },
            ]}
          />
        </div>
      </div>

      <p className="mt-2 text-2xs leading-relaxed text-faint">{BLURB[mode]}</p>

      {mode === "reflexion" && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-2xs uppercase tracking-[0.18em] text-muted">Rounds</span>
          <div className="w-32">
            <Segmented<string>
              ariaLabel="Reflexion rounds"
              value={String(rounds)}
              onChange={(v) => onRounds(Number(v))}
              options={[
                { value: "1", label: "1" },
                { value: "2", label: "2" },
                { value: "3", label: "3" },
              ]}
            />
          </div>
        </div>
      )}

      {mode === "ensemble" && (
        <p className="mt-1 text-2xs text-faint">
          Runs multiple rewriters; cost is the sum across models.
        </p>
      )}
    </div>
  );
}
