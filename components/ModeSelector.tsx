"use client";

import { Segmented } from "./controls";
import type { ForgeMode } from "@/lib/schema";

const OPTIONS: { value: ForgeMode; label: string }[] = [
  { value: "single", label: "Quick" },
  { value: "ensemble", label: "Compare models" },
  { value: "reflexion", label: "Self-improve" },
];

const BLURB: Record<ForgeMode, string> = {
  single: "One model, one pass. Fastest and cheapest.",
  ensemble: "Several models rewrite in parallel, then the best parts are merged.",
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
    <div className="rounded-xl border border-hairline bg-surface px-4 py-3 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted">Effort</span>
        <div className="w-56 sm:w-64">
          <Segmented<ForgeMode>
            ariaLabel="Effort"
            value={mode}
            onChange={onMode}
            options={OPTIONS}
          />
        </div>
      </div>

      <p className="mt-2 text-2xs leading-relaxed text-faint">{BLURB[mode]}</p>

      {mode === "reflexion" && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-2xs text-muted">Rounds</span>
          <div className="w-32">
            <Segmented<string>
              ariaLabel="Self-improve rounds"
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
        <p className="mt-1 text-2xs text-faint">Runs several models; cost is the sum across them.</p>
      )}
    </div>
  );
}
