"use client";

export function ForgeButton({
  onClick,
  loading,
  disabled,
  estCost,
}: {
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
  estCost: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`group relative w-full overflow-hidden rounded border font-mono text-sm font-semibold tracking-wide transition-all duration-150 ${
        disabled && !loading
          ? "cursor-not-allowed border-hairline bg-surface-2 text-faint"
          : "border-ember-strong bg-ember text-on-ember hover:bg-ember-strong active:translate-y-px"
      }`}
      style={{ height: 46 }}
    >
      {/* molten sweep while forging */}
      {loading && (
        <span className="pointer-events-none absolute inset-0 overflow-hidden">
          <span className="forge-bar absolute inset-y-0 -left-1/3 w-1/3 animate-forge-sweep" />
        </span>
      )}
      <span className="relative flex items-center justify-center gap-2">
        {loading ? (
          <>
            <span className="animate-ember-pulse">◆</span>
            <span>FORGING</span>
            <span className="animate-ember-pulse">◆</span>
          </>
        ) : (
          <>
            <span>FORGE</span>
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
              ▸
            </span>
            {!disabled && (
              <span className="ml-1 text-2xs font-normal text-on-ember/75 tabular-nums">
                ≈ {estCost}
              </span>
            )}
          </>
        )}
      </span>
    </button>
  );
}
