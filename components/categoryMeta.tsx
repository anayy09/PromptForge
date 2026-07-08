"use client";

import {
  MessageSquare,
  BookOpen,
  Images,
  Stethoscope,
  Code2,
  Workflow,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import type { AppCategory } from "@/lib/registry";

/**
 * The friendly presentation layer for categories. `lib/categories.ts` stays the
 * behavioral source of truth (rewrite rules, default models); this module owns
 * only how a category is shown to a non-technical user: a plain-English label, a
 * one-line description with no jargon, and a real icon instead of an ASCII glyph.
 */
export interface CategoryMeta {
  /** Plain, recognizable name (no internal ids like "data-viz-multimodal"). */
  label: string;
  /** One line a layman understands. No "rewriter/target/agentic" vocabulary. */
  plain: string;
  icon: LucideIcon;
}

export const CATEGORY_META: Record<AppCategory, CategoryMeta> = {
  general: {
    label: "Everyday",
    plain: "Writing, explaining, planning, and general questions",
    icon: MessageSquare,
  },
  research: {
    label: "Research",
    plain: "Deep analysis, literature, and academic writing",
    icon: BookOpen,
  },
  "data-viz-multimodal": {
    label: "Image & audio",
    plain: "Prompts about a picture, video, or audio file",
    icon: Images,
  },
  medical: {
    label: "Medical",
    plain: "Clinical notes and framing (never a diagnosis)",
    icon: Stethoscope,
  },
  coding: {
    label: "Coding",
    plain: "Programming, debugging, and code review",
    icon: Code2,
  },
  agentic: {
    label: "Automation",
    plain: "Multi-step tasks and tool-using assistants",
    icon: Workflow,
  },
  "image-gen": {
    label: "Image generation",
    plain: "Describe a picture for an image generator",
    icon: Wand2,
  },
};

export function categoryMeta(id: AppCategory): CategoryMeta {
  return CATEGORY_META[id];
}
