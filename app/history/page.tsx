"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getHistory,
  deleteEntry,
  patchEntry,
  clearHistory,
  type HistoryEntry,
} from "@/lib/storage";
import { CATEGORIES } from "@/lib/categories";
import { formatCost, relativeTime } from "@/lib/format";
import { useLoadIntoForge } from "@/components/useLoadIntoForge";
import { useCopy } from "@/components/useCopy";

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [query, setQuery] = useState("");
  const [favOnly, setFavOnly] = useState(false);

  useEffect(() => {
    getHistory()
      .then(setEntries)
      .catch(() => setEntries([]));
  }, []);

  const filtered = useMemo(() => {
    if (!entries) return [];
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (favOnly && !e.favorite) return false;
      if (!q) return true;
      return (
        (e.title ?? "").toLowerCase().includes(q) ||
        e.rawPrompt.toLowerCase().includes(q) ||
        e.enhancedPrompt.toLowerCase().includes(q) ||
        e.modelName.toLowerCase().includes(q)
      );
    });
  }, [entries, query, favOnly]);

  const remove = async (id: string) => {
    await deleteEntry(id);
    setEntries((prev) => prev?.filter((e) => e.id !== id) ?? null);
  };
  const toggleFav = async (id: string, favorite: boolean) => {
    await patchEntry(id, { favorite });
    setEntries((prev) => prev?.map((e) => (e.id === id ? { ...e, favorite } : e)) ?? null);
  };
  const wipe = async () => {
    if (!confirm("Delete all forge history? This cannot be undone.")) return;
    await clearHistory();
    setEntries([]);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-ink">Forge history</h1>
          <p className="mt-0.5 text-xs text-muted">
            Every forge is saved locally in your browser. Nothing leaves this machine.
          </p>
        </div>
        {entries && entries.length > 0 && (
          <button
            onClick={wipe}
            className="rounded border border-hairline bg-surface px-2.5 py-1.5 text-2xs text-muted hover:border-danger/50 hover:text-danger"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search history…"
          spellCheck={false}
          className="w-full rounded border border-hairline bg-sunken px-3 py-2 font-mono text-sm text-ink placeholder:text-faint focus:border-ember focus:bg-canvas focus:outline-none"
        />
        <button
          onClick={() => setFavOnly((f) => !f)}
          className={`shrink-0 rounded border px-3 py-2 text-2xs font-medium transition-colors ${
            favOnly
              ? "border-ember bg-ember/10 text-ember"
              : "border-hairline bg-surface text-muted hover:text-ink"
          }`}
        >
          ★ Favorites
        </button>
      </div>

      {entries === null ? (
        <div className="p-8 text-center text-xs text-muted">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded border border-dashed border-hairline-strong/60 p-10 text-center">
          <div className="mb-2 font-mono text-xl text-faint">◇</div>
          <p className="text-sm text-ink-soft">
            {entries.length === 0 ? "No forges yet." : "Nothing matches."}
          </p>
          {entries.length === 0 && (
            <p className="mt-1 text-xs text-muted">Forge a prompt and it will appear here.</p>
          )}
        </div>
      ) : (
        <div className="divide-y divide-hairline overflow-hidden rounded border border-hairline">
          {filtered.map((e) => (
            <HistoryRow
              key={e.id}
              e={e}
              onDelete={() => remove(e.id)}
              onToggleFav={() => toggleFav(e.id, !e.favorite)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryRow({
  e,
  onDelete,
  onToggleFav,
}: {
  e: HistoryEntry;
  onDelete: () => void;
  onToggleFav: () => void;
}) {
  const [open, setOpen] = useState(false);
  const load = useLoadIntoForge();
  const { copied, copy } = useCopy();
  const cat = CATEGORIES[e.category];

  return (
    <div className="bg-surface">
      <div className="flex items-start gap-3 px-3.5 py-3">
        <button
          onClick={onToggleFav}
          title={e.favorite ? "Unfavorite" : "Favorite"}
          className={`mt-0.5 text-sm ${e.favorite ? "text-ember" : "text-faint hover:text-muted"}`}
        >
          {e.favorite ? "★" : "☆"}
        </button>
        <button onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className={`font-mono text-xs ${cat.tone === "ember" ? "text-ember" : "text-steel"}`}>
              {cat.glyph}
            </span>
            <span className="truncate text-sm text-ink">{e.title || e.rawPrompt.slice(0, 48)}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-2xs tabular-nums text-faint">
            <span>{relativeTime(e.ts)}</span>
            <span>· {e.modelName}</span>
            {e.targetName && <span>→ {e.targetName}</span>}
            <span>· {formatCost(e.cost, e.costApproximate)}</span>
          </div>
        </button>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <button
            onClick={() => load({ rawPrompt: e.rawPrompt, category: e.category })}
            className="rounded border border-hairline bg-surface px-2.5 py-1 text-2xs text-ink-soft hover:border-ember hover:text-ember"
          >
            Re-forge ▸
          </button>
          <div className="flex gap-2 text-2xs">
            <button onClick={() => copy(e.enhancedPrompt)} className="text-muted hover:text-ink">
              {copied ? "✓" : "copy"}
            </button>
            <button onClick={onDelete} className="text-muted hover:text-danger">
              del
            </button>
          </div>
        </div>
      </div>
      {open && (
        <div className="grid gap-3 px-3.5 pb-3.5 md:grid-cols-2">
          <Block label="Raw" text={e.rawPrompt} muted />
          <Block label="Forged" text={e.enhancedPrompt} />
          {e.changes.length > 0 && (
            <div className="md:col-span-2">
              <div className="mb-1 text-2xs uppercase tracking-[0.18em] text-muted">Changes</div>
              <ul className="flex flex-col gap-1">
                {e.changes.map((c, i) => (
                  <li key={i} className="text-xs leading-relaxed">
                    <span className="bracket">[+]</span>{" "}
                    <span className="text-ink-soft">{c.what}</span>
                    <span className="text-muted"> — {c.why}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Block({ label, text, muted }: { label: string; text: string; muted?: boolean }) {
  return (
    <div>
      <div className="mb-1 text-2xs uppercase tracking-[0.18em] text-muted">{label}</div>
      <pre
        className={`max-h-52 overflow-auto whitespace-pre-wrap break-words rounded border border-hairline bg-canvas px-3 py-2 font-mono text-xs leading-relaxed ${
          muted ? "text-muted" : "text-ink"
        }`}
      >
        {text}
      </pre>
    </div>
  );
}
