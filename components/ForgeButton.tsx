"use client";

import { Wand2, Loader2 } from "lucide-react";

export function ForgeButton({
  onClick,
  loading,
  disabled,
  estCost,
  label = "Improve my prompt",
  loadingLabel = "Improving…",
}: {
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
  estCost: string;
  label?: string;
  loadingLabel?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl text-sm font-semibold transition-all duration-150 ${
        disabled && !loading
          ? "cursor-not-allowed bg-surface-2 text-faint"
          : "bg-ember text-on-ember shadow-ember-glow hover:bg-ember-strong active:translate-y-px"
      }`}
    >
      {loading ? (
        <>
          <Loader2 size={16} className="animate-spin" aria-hidden />
          <span>{loadingLabel}</span>
        </>
      ) : (
        <>
          <Wand2 size={16} strokeWidth={2.2} aria-hidden />
          <span>{label}</span>
          {!disabled && (
            <span className="ml-1 text-2xs font-normal tabular-nums text-on-ember/75">
              ≈ {estCost}
            </span>
          )}
        </>
      )}
    </button>
  );
}
