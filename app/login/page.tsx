"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") || "/";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Sign-in failed.");
        return;
      }
      // Full navigation so middleware re-evaluates with the fresh cookie.
      window.location.assign(from.startsWith("/") ? from : "/");
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center">
      <div className="panel rounded p-6">
        <div className="mb-1 text-2xs uppercase tracking-wide text-faint">
          <span className="bracket">[ ]</span> restricted forge
        </div>
        <h1 className="mb-1 text-lg font-semibold text-ink">Access required</h1>
        <p className="mb-5 text-xs text-muted">
          This instance is gated. Enter the access password to continue.
        </p>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            aria-label="Access password"
            className="w-full rounded-sm border border-hairline bg-sunken px-3 py-2 text-sm text-ink outline-none placeholder:text-faint focus:border-ember"
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          <button
            type="submit"
            disabled={!password || busy}
            className="rounded-sm bg-ember px-3 py-2 text-sm font-medium text-on-ember transition-opacity disabled:opacity-40"
          >
            {busy ? "Checking..." : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
