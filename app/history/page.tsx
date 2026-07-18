"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getHistory,
  deleteEntry,
  patchEntry,
  clearHistory,
  type HistoryEntry,
} from "@/lib/storage";
import { CATEGORY_META } from "@/components/categoryMeta";
import { relativeTime } from "@/lib/format";
import { useLoadIntoForge } from "@/components/useLoadIntoForge";
import { useCopy } from "@/components/useCopy";
import { Star, Check } from "lucide-react";

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
    if (!confirm("Delete all history? This cannot be undone.")) return;
    await clearHistory();
    setEntries([]);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">History</h1>
          <p className="mt-0.5 text-xs text-muted">
            Every prompt you improve is saved locally in your browser. Nothing leaves this machine.
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
          className="w-full rounded-lg border border-hairline bg-sunken px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-ember focus:bg-canvas focus:outline-none"
        />
        <button
          onClick={() => setFavOnly((f) => !f)}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-2xs font-medium transition-colors ${
            favOnly
              ? "border-ember bg-ember/10 text-ember"
              : "border-hairline bg-surface text-muted hover:text-ink"
          }`}
        >
          <Star size={13} aria-hidden fill={favOnly ? "currentColor" : "none"} /> Favorites
        </button>
      </div>

      {entries === null ? (
        <div className="p-8 text-center text-xs text-muted">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-hairline-strong/60 p-10 text-center">
          <p className="text-sm text-ink-soft">
            {entries.length === 0 ? "No history yet." : "Nothing matches."}
          </p>
          {entries.length === 0 && (
            <p className="mt-1 text-xs text-muted">Improve a prompt and it will appear here.</p>
          )}
        </div>
      ) : (
        <div className="divide-y divide-hairline overflow-hidden rounded-xl border border-hairline">
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
  const meta = CATEGORY_META[e.category];
  const Icon = meta.icon;

  return (
    <div className="bg-surface">
      <div className="flex items-start gap-3 px-3.5 py-3">
        <button
          onClick={onToggleFav}
          title={e.favorite ? "Remove from saved" : "Save"}
          className={`mt-0.5 ${e.favorite ? "text-ember" : "text-faint hover:text-muted"}`}
        >
          <Star size={15} aria-hidden fill={e.favorite ? "currentColor" : "none"} />
        </button>
        <button onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Icon size={13} className="text-muted" aria-hidden />
            <span className="truncate text-sm text-ink">{e.title || e.rawPrompt.slice(0, 48)}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-2xs tabular-nums text-faint">
            <span>{relativeTime(e.ts)}</span>
            <span>· {e.modelName}</span>
            {e.targetName && <span>→ {e.targetName}</span>}
          </div>
        </button>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <button
            onClick={() => load({ rawPrompt: e.rawPrompt, category: e.category })}
            className="rounded-lg border border-hairline bg-surface px-2.5 py-1 text-2xs text-ink-soft hover:border-ember hover:text-ember"
          >
            Improve again
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
          <Block label="Original" text={e.rawPrompt} muted />
          <Block label="Improved" text={e.enhancedPrompt} />
          {e.changes.length > 0 && (
            <div className="md:col-span-2">
              <div className="mb-1 text-2xs uppercase tracking-[0.18em] text-muted">What changed</div>
              <ul className="flex flex-col gap-1">
                {e.changes.map((c, i) => (
                  <li key={i} className="flex gap-1.5 text-xs leading-relaxed">
                    <Check size={13} className="mt-0.5 shrink-0 text-quench" aria-hidden />
                    <span>
                      <span className="text-ink-soft">{c.what}</span>
                      <span className="text-muted"> — {c.why}</span>
                    </span>
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
