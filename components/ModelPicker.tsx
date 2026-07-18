"use client";

import { Field, Select } from "./controls";
import {
  getRewriters,
  getTargetsForCategory,
  getById,
  type AppCategory,
} from "@/lib/registry";
import { CATEGORIES } from "@/lib/categories";
import { useModelAvailability } from "./useModelAvailability";

// Categories where choosing a distinct target model is meaningful.
const TARGETED: AppCategory[] = ["image-gen", "medical", "data-viz-multimodal"];

export function ModelPicker({
  category,
  rewriterId,
  targetId,
  onRewriter,
  onTarget,
}: {
  category: AppCategory;
  rewriterId: string;
  targetId: string;
  onRewriter: (id: string) => void;
  onTarget: (id: string) => void;
}) {
  const { filter } = useModelAvailability();
  const rewriters = filter(getRewriters());
  const isDefault = rewriterId === CATEGORIES[category].defaultRewriterId;
  const showTarget = TARGETED.includes(category);
  const targets = showTarget ? filter(getTargetsForCategory(category)) : [];

  return (
    <div
      className={`grid gap-3 rounded-xl border border-hairline bg-surface p-4 shadow-soft ${
        showTarget ? "sm:grid-cols-2" : ""
      }`}
    >
      <Field
        label="Model that rewrites"
        hint={
          isDefault ? (
            <span className="text-ember">recommended</span>
          ) : (
            <button className="text-ember hover:underline" onClick={() => onRewriter(CATEGORIES[category].defaultRewriterId)}>
              reset
            </button>
          )
        }
      >
        <Select
          value={rewriterId}
          onChange={onRewriter}
          ariaLabel="Model that rewrites"
          options={rewriters.map((m) => ({ value: m.id, label: m.name, hint: m.category }))}
        />
        <span className="text-2xs text-faint">{getById(rewriterId)?.bestFor ?? ""}</span>
      </Field>

      {showTarget && (
        <Field label="Optimized for" hint={<span className="text-steel">where you will use it</span>}>
          <Select
            value={targetId}
            onChange={onTarget}
            ariaLabel="Target model"
            options={[
              { value: "", label: "auto" },
              ...targets.map((m) => ({ value: m.id, label: m.name, hint: m.category })),
            ]}
          />
          <span className="text-2xs tabular-nums text-faint">
            {targetId ? getById(targetId)?.bestFor ?? "" : "no specific target"}
          </span>
        </Field>
      )}
    </div>
  );
}
