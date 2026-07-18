"use client";

import { getChatModels, getImageModels, getById } from "@/lib/registry";
import { useModelAvailability } from "../useModelAvailability";
import { Select } from "../controls";

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
  const { filter } = useModelAvailability();
  const chat = filter(getChatModels());
  const images = filter(getImageModels());
  const groups = GROUP_ORDER.filter((g) => chat.some((m) => m.category === g));
  const current = getById(value);
  const isImage = current?.category === "Image Generation";

  const options = [
    ...groups.flatMap((g) =>
      chat
        .filter((m) => m.category === g)
        .map((m) => ({ value: m.id, label: m.name, group: GROUP_LABEL[g] ?? g })),
    ),
    ...images.map((m) => ({ value: m.id, label: m.name, group: "Image generation" })),
  ];

  return (
    <div className="flex flex-col gap-1">
      <Select ariaLabel="Model" value={value} onChange={onChange} options={options} />
      {current && (
        <p className="px-1 text-2xs leading-relaxed text-faint">
          {isImage ? "Generates images from a description" : current.bestFor}
          {!isImage && modalityBadges(current.inputModalities)
            ? ` · ${modalityBadges(current.inputModalities)}`
            : ""}
        </p>
      )}
    </div>
  );
}

