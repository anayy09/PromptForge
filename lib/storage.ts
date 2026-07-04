"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { AppCategory } from "./registry";
import type { Change, Knobs } from "./schema";

/**
 * Local persistence. History lives in IndexedDB (structured, queryable);
 * settings live in localStorage (small, synchronous). Single-user, no server DB.
 */

export interface HistoryEntry {
  id: string;
  ts: number;
  category: AppCategory;
  rawPrompt: string;
  enhancedPrompt: string;
  changes: Change[];
  assumptions: string[];
  variants?: string[];
  modelId: string;
  modelName: string;
  targetName?: string | null;
  cost: number | null;
  costApproximate: boolean;
  favorite: boolean;
  tags: string[];
  /** Optional user-given title; falls back to a slug of the raw prompt. */
  title?: string;
}

interface ForgeDB extends DBSchema {
  history: {
    key: string;
    value: HistoryEntry;
    indexes: { "by-ts": number; "by-category": string; "by-favorite": string };
  };
}

const DB_NAME = "promptforge";
const DB_VERSION = 1;

let _dbp: Promise<IDBPDatabase<ForgeDB>> | null = null;

function db(): Promise<IDBPDatabase<ForgeDB>> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (!_dbp) {
    _dbp = openDB<ForgeDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        const store = database.createObjectStore("history", { keyPath: "id" });
        store.createIndex("by-ts", "ts");
        store.createIndex("by-category", "category");
        store.createIndex("by-favorite", "favorite" as never);
      },
    });
  }
  return _dbp;
}

export function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function saveHistory(entry: HistoryEntry): Promise<void> {
  const d = await db();
  await d.put("history", entry);
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const d = await db();
  const all = await d.getAllFromIndex("history", "by-ts");
  return all.reverse(); // newest first
}

export async function getEntry(id: string): Promise<HistoryEntry | undefined> {
  const d = await db();
  return d.get("history", id);
}

export async function deleteEntry(id: string): Promise<void> {
  const d = await db();
  await d.delete("history", id);
}

export async function clearHistory(): Promise<void> {
  const d = await db();
  await d.clear("history");
}

export async function patchEntry(
  id: string,
  patch: Partial<HistoryEntry>,
): Promise<HistoryEntry | undefined> {
  const d = await db();
  const existing = await d.get("history", id);
  if (!existing) return undefined;
  const updated = { ...existing, ...patch };
  await d.put("history", updated);
  return updated;
}

/* ---------------------------------- Settings --------------------------------- */

export interface Settings {
  theme: "light" | "dark" | "system";
  defaultCategory: AppCategory;
  rewriterOverrides: Partial<Record<AppCategory, string>>;
  knobs: Knobs;
  requestVariants: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  defaultCategory: "general",
  rewriterOverrides: {},
  knobs: { preserveWording: true },
  requestVariants: false,
};

const SETTINGS_KEY = "promptforge.settings.v2";

export function loadSettings(): Settings {
  if (typeof localStorage === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* quota or private mode: ignore */
  }
}
