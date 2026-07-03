"use client";

import { useRouter } from "next/navigation";
import type { AppCategory } from "@/lib/registry";

/** Hand a prompt off to the forge: stash it, then navigate to the workbench. */
export function useLoadIntoForge() {
  const router = useRouter();
  return (payload: { rawPrompt: string; category: AppCategory }) => {
    try {
      sessionStorage.setItem("promptforge.load", JSON.stringify(payload));
    } catch {
      /* ignore */
    }
    router.push("/");
  };
}
