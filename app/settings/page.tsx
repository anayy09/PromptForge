"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/components/providers";
import { Field, Select, Segmented, Toggle } from "@/components/controls";
import { CATEGORIES, CATEGORY_ORDER } from "@/lib/categories";
import { getRewriters, getAll, priceLabel, type AppCategory } from "@/lib/registry";

export default function SettingsPage() {
  const { settings, update, hydrated } = useSettings();
  const rewriters = getRewriters();

  if (!hydrated) {
    return <div className="p-8 text-center text-xs text-muted">Loading settings…</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-bold tracking-tight text-ink">Settings</h1>
        <p className="mt-0.5 text-xs text-muted">
          Stored locally in your browser. Defaults feed every new forge.
        </p>
      </div>

      <EndpointStatus />

      <Section title="Defaults">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Default category">
            <Select
              value={settings.defaultCategory}
              onChange={(v) => update({ defaultCategory: v as AppCategory })}
              ariaLabel="Default category"
            >
              {CATEGORY_ORDER.map((id) => (
                <option key={id} value={id}>
                  {CATEGORIES[id].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Theme">
            <Segmented
              ariaLabel="Theme"
              value={settings.theme}
              onChange={(v) => update({ theme: v })}
              options={[
                { value: "light", label: "light" },
                { value: "dark", label: "dark" },
                { value: "system", label: "system" },
              ]}
            />
          </Field>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Field label="Strictness">
            <Segmented
              ariaLabel="Default strictness"
              value={settings.knobs.strictness ?? "medium"}
              onChange={(v) => update({ knobs: { ...settings.knobs, strictness: v } })}
              options={[
                { value: "low", label: "low" },
                { value: "medium", label: "med" },
                { value: "high", label: "high" },
              ]}
            />
          </Field>
          <Field label="Length">
            <Segmented
              ariaLabel="Default verbosity"
              value={settings.knobs.verbosity ?? "normal"}
              onChange={(v) => update({ knobs: { ...settings.knobs, verbosity: v } })}
              options={[
                { value: "terse", label: "terse" },
                { value: "normal", label: "normal" },
                { value: "detailed", label: "detailed" },
              ]}
            />
          </Field>
          <Field label="Tone">
            <Segmented
              ariaLabel="Default tone"
              value={settings.knobs.tone ?? "neutral"}
              onChange={(v) => update({ knobs: { ...settings.knobs, tone: v } })}
              options={[
                { value: "neutral", label: "neutral" },
                { value: "formal", label: "formal" },
                { value: "terse", label: "terse" },
              ]}
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <Toggle
            checked={settings.knobs.preserveWording ?? false}
            onChange={(v) => update({ knobs: { ...settings.knobs, preserveWording: v } })}
            label="Preserve my wording by default"
          />
          <Toggle
            checked={settings.requestVariants}
            onChange={(v) => update({ requestVariants: v })}
            label="Request variants by default"
          />
        </div>
      </Section>

      <Section
        title="Rewriter overrides"
        hint="Pick a different rewriter per category. Leave on default unless you have a reason."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {CATEGORY_ORDER.map((id) => {
            const def = CATEGORIES[id].defaultRewriterId;
            const current = settings.rewriterOverrides[id] ?? def;
            return (
              <Field
                key={id}
                label={CATEGORIES[id].label}
                hint={
                  current === def ? (
                    <span className="text-faint">default</span>
                  ) : (
                    <button
                      className="text-ember hover:underline"
                      onClick={() => {
                        const next = { ...settings.rewriterOverrides };
                        delete next[id];
                        update({ rewriterOverrides: next });
                      }}
                    >
                      reset
                    </button>
                  )
                }
              >
                <Select
                  value={current}
                  onChange={(v) =>
                    update({ rewriterOverrides: { ...settings.rewriterOverrides, [id]: v } })
                  }
                  ariaLabel={`Rewriter for ${CATEGORIES[id].label}`}
                >
                  {rewriters.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
                <span className="text-2xs tabular-nums text-faint">{priceLabel(current)}</span>
              </Field>
            );
          })}
        </div>
      </Section>

      <RegistryTable />
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel rounded p-4">
      <div className="mb-3">
        <h2 className="text-2xs uppercase tracking-[0.2em] text-ink">
          <span className="bracket">[</span> {title} <span className="bracket">]</span>
        </h2>
        {hint && <p className="mt-1 text-2xs text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function EndpointStatus() {
  const [state, setState] = useState<{ configured: boolean; host: string | null } | null>(null);
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setState)
      .catch(() => setState({ configured: false, host: null }));
  }, []);

  const ok = state?.configured;
  return (
    <section className="panel flex items-center gap-3 rounded px-4 py-3">
      <span className={`h-2 w-2 rounded-full ${ok ? "bg-quench" : "bg-danger"}`} />
      <span className="text-xs text-ink-soft">
        {state === null
          ? "Checking endpoint…"
          : ok
            ? `Endpoint connected`
            : "Endpoint not configured. Set MODEL_API_BASE_URL and MODEL_API_KEY (or API_KEY / BASE_URL)."}
      </span>
    </section>
  );
}

function RegistryTable() {
  const models = getAll();
  return (
    <Section title={`Model registry (${models.length})`} hint="The single source of truth. Read-only reference.">
      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[720px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-hairline text-left text-2xs uppercase tracking-wider text-muted">
              <th className="py-2 pr-3 font-medium">Model</th>
              <th className="py-2 pr-3 font-medium">Category</th>
              <th className="py-2 pr-3 font-medium">In/Out $/MTok</th>
              <th className="py-2 pr-3 font-medium">Context</th>
              <th className="py-2 pr-3 font-medium">Modalities</th>
              <th className="py-2 font-medium">Best for</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {models.map((m) => (
              <tr key={m.id} className="align-top text-ink-soft">
                <td className="py-2 pr-3 font-mono text-ink">{m.name}</td>
                <td className="py-2 pr-3 text-muted">{m.category}</td>
                <td className="py-2 pr-3 tabular-nums text-muted">
                  {m.costInput == null
                    ? "usage"
                    : `$${m.costInput.toFixed(2)} / ${m.costOutput == null ? "-" : "$" + m.costOutput.toFixed(2)}`}
                </td>
                <td className="py-2 pr-3 text-muted">{m.contextWindow}</td>
                <td className="py-2 pr-3 text-muted">
                  {m.inputModalities.join("+")} → {m.outputModalities.join("+")}
                </td>
                <td className="py-2 text-muted">{m.bestFor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
