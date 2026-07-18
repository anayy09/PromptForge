"use client";

import { Loader2 } from "lucide-react";
import { CATEGORY_ORDER } from "@/lib/categories";
import { CATEGORY_META } from "./categoryMeta";
import { Select } from "./controls";
import type { AppCategory } from "@/lib/registry";

/**
 * Simple-mode category control. The task type is detected automatically as the
 * user types; this bar just shows the current pick and lets them override it
 * from a plain dropdown. No "rewriter/target/auto-route" vocabulary.
 */
export function SimpleCategoryBar({
  value,
  onChange,
  detecting,
  wasAutoDetected,
}: {
  value: AppCategory;
  onChange: (c: AppCategory) => void;
  detecting: boolean;
  wasAutoDetected: boolean;
}) {
  const meta = CATEGORY_META[value];
  const Icon = meta.icon;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
      <span>Treating this as</span>
      <Select
        variant="pill"
        ariaLabel="Type of task"
        value={value}
        onChange={(v) => onChange(v as AppCategory)}
        leading={<Icon size={14} strokeWidth={2} aria-hidden />}
        options={CATEGORY_ORDER.map((id) => ({ value: id, label: CATEGORY_META[id].label }))}
      />
      {detecting ? (
        <span className="inline-flex items-center gap-1 text-faint">
          <Loader2 size={12} className="animate-spin" aria-hidden />
          detecting…
        </span>
      ) : (
        wasAutoDetected && <span className="text-faint">· picked automatically</span>
      )}
    </div>
  );
}
