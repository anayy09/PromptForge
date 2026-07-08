/**
 * PromptForge wordmark: an ember "spark on anvil" glyph plus the letterspaced
 * name. The mark is inline SVG so it scales and inherits currentColor for the
 * text half; the spark stays ember.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* anvil base */}
        <path
          d="M3 13.5h14M5 13.5v2.5M15 13.5v2.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="square"
          className="text-ink/70"
        />
        {/* forged bar */}
        <rect x="6" y="10.5" width="8" height="2.2" className="fill-ink/80" />
        {/* ember spark */}
        <path
          d="M10 1.5l1.7 4.4 4.3.5-3.3 2.8 1.1 4.3L10 11.4 6.2 13.5l1.1-4.3L4 6.4l4.3-.5z"
          className="fill-ember"
        />
      </svg>
      <span className="font-sans font-bold tracking-tight text-[1.02rem] leading-none">
        <span className="text-ink">Prompt</span>
        <span className="text-ember">Forge</span>
      </span>
    </span>
  );
}
