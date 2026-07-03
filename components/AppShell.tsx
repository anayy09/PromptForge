"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Providers } from "./providers";
import { Wordmark } from "./Wordmark";
import { ThemeToggle } from "./ThemeToggle";
import { ConnectivityDot } from "./ConnectivityDot";

const NAV = [
  { href: "/", label: "Forge" },
  { href: "/library", label: "Library" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
];

function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1">
      {NAV.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative px-2.5 py-1.5 text-xs font-medium rounded-sm transition-colors ${
              active ? "text-ink" : "text-muted hover:text-ink hover:bg-surface-2"
            }`}
          >
            {item.label}
            {active && (
              <span className="absolute inset-x-2.5 -bottom-px h-0.5 bg-ember rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 border-b border-hairline bg-canvas/85 backdrop-blur supports-[backdrop-filter]:bg-canvas/70">
          <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-4 px-4 sm:px-6">
            <Link href="/" className="shrink-0" aria-label="PromptForge home">
              <Wordmark />
            </Link>
            <div className="mx-1 hidden h-5 w-px bg-hairline sm:block" />
            <div className="hidden sm:block">
              <Nav />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <ConnectivityDot />
              <ThemeToggle />
            </div>
          </div>
          {/* Mobile nav row */}
          <div className="border-t border-hairline px-2 py-1.5 sm:hidden">
            <Nav />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>

        <footer className="border-t border-hairline">
          <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-2xs text-muted sm:px-6">
            <span className="text-faint">
              PromptForge rewrites prompts. It never answers them.
            </span>
            <span className="ml-auto tabular-nums text-faint">
              registry-driven · cost-transparent · local-first
            </span>
          </div>
        </footer>
      </div>
    </Providers>
  );
}
