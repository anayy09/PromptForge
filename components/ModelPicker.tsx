"use client";

import { Field, Select } from "./controls";
import {
  getRewriters,
  getTargetsForCategory,
  getById,
  priceLabel,
  type AppCategory,
} from "@/lib/registry";
import { CATEGORIES } from "@/lib/categories";

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
  const rewriters = getRewriters();
  const isDefault = rewriterId === CATEGORIES[category].defaultRewriterId;
  const showTarget = TARGETED.includes(category);
  const targets = showTarget ? getTargetsForCategory(category) : [];

  return (
    <div className={`grid gap-3 ${showTarget ? "sm:grid-cols-2" : ""}`}>
      <Field
        label="Rewriter"
        hint={
          isDefault ? (
            <span className="text-ember">default</span>
          ) : (
            <button className="text-ember hover:underline" onClick={() => onRewriter(CATEGORIES[category].defaultRewriterId)}>
              reset
            </button>
          )
        }
      >
        <Select value={rewriterId} onChange={onRewriter} ariaLabel="Rewriter model">
          {rewriters.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} · {m.category}
            </option>
          ))}
        </Select>
        <span className="text-2xs tabular-nums text-faint">{priceLabel(rewriterId)}</span>
      </Field>

      {showTarget && (
        <Field label="Target" hint={<span className="text-steel">the prompt is tuned for this</span>}>
          <Select value={targetId} onChange={onTarget} ariaLabel="Target model">
            <option value="">auto</option>
            {targets.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} · {m.category}
              </option>
            ))}
          </Select>
          <span className="text-2xs tabular-nums text-faint">
            {targetId ? getById(targetId)?.bestFor ?? "" : "no specific target"}
          </span>
        </Field>
      )}
    </div>
  );
}
