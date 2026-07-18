"use client";

import { useEffect, useMemo, useState } from "react";
import type { ModelSource, RegistryModel } from "@/lib/registry";

/**
 * Which providers the server has credentials for, from /api/health. The
 * registry itself is static client data, so pickers use this to hide models
 * whose backend is not configured. Until the check resolves (or if it fails),
 * every source is treated as available so the UI never flashes empty; the API
 * routes remain the enforcing boundary.
 */
export function useModelAvailability() {
  const [sources, setSources] = useState<ModelSource[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => {
        if (alive && Array.isArray(d?.sources)) setSources(d.sources as ModelSource[]);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return useMemo(() => {
    const isAvailable = (m: RegistryModel) => sources === null || sources.includes(m.source);
    const filter = (list: RegistryModel[]) => list.filter(isAvailable);
    return { sources, isAvailable, filter };
  }, [sources]);
}
