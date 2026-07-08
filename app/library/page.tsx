"use client";

import { useMemo, useState } from "react";
import { TEMPLATES, type PromptTemplate } from "@/lib/templates";
import { CATEGORY_ORDER } from "@/lib/categories";
import { CATEGORY_META } from "@/components/categoryMeta";
import type { AppCategory } from "@/lib/registry";
import { useLoadIntoForge } from "@/components/useLoadIntoForge";
import { useCopy } from "@/components/useCopy";

export default function LibraryPage() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<AppCategory | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TEMPLATES.filter((t) => {
      if (cat !== "all" && t.category !== cat) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.body.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.includes(q))
      );
    });
  }, [query, cat]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">Prompt library</h1>
        <p className="mt-0.5 text-xs text-muted">
          Reusable prompt templates. Load one into Enhance, fill in the{" "}
          <span className="text-steel">&lt;placeholders&gt;</span>, then improve it.
        </p>
      </div>

      {/* controls */}
      <div className="flex flex-col gap-2.5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search templates, tags, contents…"
          spellCheck={false}
          className="w-full rounded-lg border border-hairline bg-sunken px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-ember focus:bg-canvas focus:outline-none"
        />
        <div className="flex flex-wrap gap-1.5">
          <Chip active={cat === "all"} onClick={() => setCat("all")}>
            All ({TEMPLATES.length})
          </Chip>
          {CATEGORY_ORDER.map((id) => {
            const n = TEMPLATES.filter((t) => t.category === id).length;
            if (!n) return null;
            return (
              <Chip key={id} active={cat === id} onClick={() => setCat(id)}>
                {CATEGORY_META[id].label} ({n})
              </Chip>
            );
          })}
        </div>
      </div>

      {/* rows */}
      <div className="divide-y divide-hairline overflow-hidden rounded border border-hairline">
        {filtered.length === 0 && (
          <div className="p-8 text-center text-xs text-muted">No structures match.</div>
        )}
        {filtered.map((t) => (
          <TemplateRow key={t.id} t={t} />
        ))}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-2xs font-medium transition-colors ${
        active
          ? "border-ember bg-ember/10 text-ember"
          : "border-hairline bg-surface text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function TemplateRow({ t }: { t: PromptTemplate }) {
  const [open, setOpen] = useState(false);
  const load = useLoadIntoForge();
  const { copied, copy } = useCopy();
  const meta = CATEGORY_META[t.category];
  const Icon = meta.icon;

  return (
    <div className="bg-surface">
      <div className="flex items-start gap-3 px-3.5 py-3">
        <Icon size={16} className="mt-0.5 text-muted" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium text-ink">{t.title}</span>
            <span className="text-2xs uppercase tracking-wider text-faint">{meta.label}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted">{t.description}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {t.tags.map((tag) => (
              <span key={tag} className="text-2xs text-faint">
                #{tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <button
            onClick={() => load({ rawPrompt: t.body, category: t.category })}
            className="rounded border border-ember-strong bg-ember px-2.5 py-1 text-2xs font-semibold text-on-ember transition-colors hover:bg-ember-strong"
          >
            Load ▸
          </button>
          <div className="flex gap-2 text-2xs">
            <button onClick={() => setOpen((o) => !o)} className="text-muted hover:text-ink">
              {open ? "hide" : "preview"}
            </button>
            <button onClick={() => copy(t.body)} className="text-muted hover:text-ink">
              {copied ? "✓" : "copy"}
            </button>
          </div>
        </div>
      </div>
      {open && (
        <pre className="mx-3.5 mb-3 whitespace-pre-wrap break-words rounded border border-hairline bg-canvas px-3 py-2.5 font-mono text-xs leading-relaxed text-ink-soft">
          {t.body}
        </pre>
      )}
    </div>
  );
}
