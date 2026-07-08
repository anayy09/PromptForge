"use client";

import { useEffect, useState } from "react";

type State = { configured: boolean } | "loading" | "error";

export function ConnectivityDot() {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    let alive = true;
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => alive && setState(d))
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, []);

  const ok = state !== "loading" && state !== "error" && state.configured;

  // The backend host is never surfaced; the indicator only reports reachability.
  const color = ok ? "bg-quench" : state === "loading" ? "bg-faint" : "bg-danger";
  const label = ok
    ? "Connected"
    : state === "loading"
      ? "Checking status"
      : "Offline";

  return (
    <span className="inline-flex items-center gap-2 text-2xs text-muted" title={label}>
      <span className="relative inline-flex h-2 w-2">
        {ok && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-quench/60 animate-ping" />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
      </span>
      <span className="hidden sm:inline tabular-nums">{ok ? "online" : "offline"}</span>
    </span>
  );
}
