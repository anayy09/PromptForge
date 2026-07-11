"use client";

import { getChatModels, getImageModels, priceLabel, getById } from "@/lib/registry";

// Friendly group headers for the model dropdown, keyed by registry category.
const GROUP_LABEL: Record<string, string> = {
  "General LLM": "General",
  "Medical LLM": "Medical",
  Code: "Code",
};
const GROUP_ORDER = ["General LLM", "Code", "Medical LLM"];

function modalityBadges(modalities: string[]): string {
  const badges: string[] = [];
  if (modalities.includes("Image")) badges.push("📷 vision");
  if (modalities.includes("Video")) badges.push("🎬 video");
  if (modalities.includes("Audio")) badges.push("🔊 audio");
  return badges.join(" · ");
}

export function ChatModelPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const chat = getChatModels();
  const images = getImageModels();
  const groups = GROUP_ORDER.filter((g) => chat.some((m) => m.category === g));
  const current = getById(value);
  const isImage = current?.category === "Image Generation";

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <select
          aria-label="Model"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          suppressHydrationWarning
          className="w-full appearance-none rounded-lg border border-hairline bg-surface px-3 py-1.5 pr-8 text-sm font-medium text-ink transition-colors hover:border-hairline-strong focus:border-ember focus:outline-none"
        >
          {groups.map((g) => (
            <optgroup key={g} label={GROUP_LABEL[g] ?? g}>
              {chat
                .filter((m) => m.category === g)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </optgroup>
          ))}
          {images.length > 0 && (
            <optgroup label="Image generation">
              {images.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-2xs text-muted">
          ▾
        </span>
      </div>
      {current && (
        <p className="px-1 text-2xs leading-relaxed text-faint">
          {isImage ? "Generates images from a description" : current.bestFor}
          {!isImage && modalityBadges(current.inputModalities)
            ? ` · ${modalityBadges(current.inputModalities)}`
            : ""}{" "}
          · <span className="tabular-nums">{priceLabel(current.id)}</span>
        </p>
      )}
    </div>
  );
}

