"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Wand2,
  MessageSquare,
  Library,
  History,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { Providers } from "./providers";
import { Wordmark } from "./Wordmark";
import { ThemeToggle } from "./ThemeToggle";
import { ConnectivityDot } from "./ConnectivityDot";

// The two co-equal products. Everything else is secondary utility.
const PRODUCTS: { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean }[] = [
  {
    href: "/",
    label: "Enhance",
    icon: Wand2,
    // Enhance owns its supporting pages (Library, History).
    match: (p) => p === "/" || p.startsWith("/library") || p.startsWith("/history"),
  },
  {
    href: "/chat",
    label: "Chat",
    icon: MessageSquare,
    match: (p) => p.startsWith("/chat"),
  },
];

const UTILITY: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/library", label: "Library", icon: Library },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

function ProductSwitch() {
  const pathname = usePathname();
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-hairline bg-surface p-1 shadow-soft">
      {PRODUCTS.map((p) => {
        const active = p.match(pathname);
        const Icon = p.icon;
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-ember text-on-ember shadow-soft"
                : "text-muted hover:text-ink hover:bg-surface-2"
            }`}
          >
            <Icon size={15} strokeWidth={2.2} aria-hidden />
            {p.label}
          </Link>
        );
      })}
    </div>
  );
}

function UtilityNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-0.5">
      {UTILITY.map((item) => {
        const active = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className={`grid h-8 w-8 place-items-center rounded-full transition-colors ${
              active ? "bg-surface-2 text-ink" : "text-muted hover:text-ink hover:bg-surface-2"
            }`}
          >
            <Icon size={16} strokeWidth={2} aria-hidden />
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
          <div className="mx-auto flex h-16 max-w-[1180px] items-center gap-4 px-4 sm:px-6">
            <Link href="/" className="shrink-0" aria-label="PromptForge home">
              <Wordmark />
            </Link>

            {/* Primary product switch, centered on wider screens. */}
            <div className="hidden flex-1 justify-center sm:flex">
              <ProductSwitch />
            </div>

            <div className="ml-auto flex items-center gap-2 sm:ml-0">
              <ConnectivityDot />
              <div className="mx-1 hidden h-5 w-px bg-hairline sm:block" />
              <UtilityNav />
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile product switch */}
          <div className="flex justify-center border-t border-hairline px-3 py-2 sm:hidden">
            <ProductSwitch />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>

        <footer className="border-t border-hairline">
          <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-2xs text-muted sm:px-6">
            <span className="text-faint">
              Enhance rewrites your prompts. Chat answers them. Two tools, one workspace.
            </span>
            <span className="ml-auto tabular-nums text-faint">local-first · cost-transparent</span>
          </div>
        </footer>
      </div>
    </Providers>
  );
}
