/** Display helpers for cost and token figures shown in the UI. */

export function formatCost(cost: number | null, approximate = false): string {
  if (cost == null) return "—";
  const prefix = approximate ? "~" : "";
  if (cost === 0) return `${prefix}$0`;
  if (cost < 0.01) {
    // Sub-cent: show enough precision to be meaningful without noise.
    return `${prefix}$${cost.toFixed(cost < 0.001 ? 5 : 4)}`;
  }
  return `${prefix}$${cost.toFixed(2)}`;
}

export function formatTokens(n: number): string {
  if (n < 1000) return `${n}`;
  return `${(n / 1000).toFixed(1)}k`;
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.round(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function slugTitle(text: string, max = 52): string {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length <= max ? clean : clean.slice(0, max - 1).trimEnd() + "…";
}
