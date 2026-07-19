"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Wand2,
  MessageSquare,
  Library,
  History,
  Settings,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  MonitorSmartphone,
  type LucideIcon,
} from "lucide-react";
import { Providers, useSettings } from "./providers";
import { Wordmark } from "./Wordmark";
import { ConnectivityDot } from "./ConnectivityDot";
import { CommandPalette } from "./CommandPalette";
import { Kbd } from "./controls";

const NAV: { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean }[] = [
  { href: "/", label: "Enhance", icon: Wand2, match: (p) => p === "/" },
  { href: "/chat", label: "Chat", icon: MessageSquare, match: (p) => p.startsWith("/chat") },
  { href: "/library", label: "Library", icon: Library, match: (p) => p.startsWith("/library") },
  { href: "/history", label: "History", icon: History, match: (p) => p.startsWith("/history") },
  { href: "/settings", label: "Settings", icon: Settings, match: (p) => p.startsWith("/settings") },
];

const SIDEBAR_KEY = "promptforge.sidebar.collapsed";

function openPalette() {
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
}

/** Single-button theme cycler: light -> dark -> system. Compact enough for the rail. */
function ThemeCycle({ collapsed }: { collapsed: boolean }) {
  const { settings, update, hydrated } = useSettings();
  const order = ["light", "dark", "system"] as const;
  const current = hydrated ? settings.theme : "system";
  const Icon = current === "light" ? Sun : current === "dark" ? Moon : MonitorSmartphone;
  const next = order[(order.indexOf(current) + 1) % order.length];
  return (
    <button
      onClick={() => update({ theme: next })}
      title={`Theme: ${current}. Click for ${next}.`}
      className={`flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-ink ${
        collapsed ? "w-9 justify-center px-0" : "w-full"
      }`}
    >
      <Icon size={16} strokeWidth={2} aria-hidden className="shrink-0" />
      {!collapsed && <span className="capitalize">{current} theme</span>}
    </button>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1");
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, c ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !c;
    });
  };

  return (
    <aside
      data-collapsed={collapsed}
      className={`sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-hairline bg-surface/60 md:flex ${
        collapsed ? "w-[3.75rem]" : "w-[14.5rem]"
      } ${hydrated ? "transition-[width] duration-200" : ""}`}
    >
      {/* identity + collapse */}
      <div className={`flex h-14 items-center border-b border-hairline ${collapsed ? "justify-center" : "justify-between pl-4 pr-2"}`}>
        {!collapsed && (
          <Link href="/" aria-label="PromptForge home" className="min-w-0">
            <Wordmark />
          </Link>
        )}
        <button
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          {collapsed ? <PanelLeftOpen size={16} aria-hidden /> : <PanelLeftClose size={16} aria-hidden />}
        </button>
      </div>

      {/* jump-to */}
      <div className={collapsed ? "px-2.5 pt-3" : "px-3 pt-3"}>
        <button
          onClick={openPalette}
          aria-label="Open command palette"
          className={`flex h-9 items-center gap-2.5 rounded-lg border border-hairline bg-canvas text-sm text-muted transition-colors hover:border-hairline-strong hover:text-ink ${
            collapsed ? "w-9 justify-center" : "w-full px-2.5"
          }`}
        >
          <Search size={15} aria-hidden className="shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Jump to…</span>
              <Kbd>⌘K</Kbd>
            </>
          )}
        </button>
      </div>

      {/* primary nav */}
      <nav className={`flex flex-1 flex-col gap-0.5 pt-4 ${collapsed ? "px-2.5" : "px-3"}`} aria-label="Primary">
        {NAV.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-current={active ? "page" : undefined}
              className={`flex h-9 items-center gap-2.5 rounded-lg text-sm font-medium transition-colors ${
                collapsed ? "w-9 justify-center" : "px-2.5"
              } ${
                active
                  ? "bg-ember/10 text-ink"
                  : "text-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <Icon
                size={16}
                strokeWidth={2.1}
                aria-hidden
                className={`shrink-0 ${active ? "text-ember" : ""}`}
              />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {/* footer utilities */}
      <div className={`flex flex-col gap-1 border-t border-hairline py-3 ${collapsed ? "items-center px-2.5" : "px-3"}`}>
        <ThemeCycle collapsed={collapsed} />
        <div className={`flex h-8 items-center ${collapsed ? "justify-center" : "gap-2.5 px-2.5"}`}>
          <ConnectivityDot />
        </div>
        {!collapsed && (
          <p className="px-2.5 pt-1 text-2xs leading-relaxed text-faint">
            History stays on this device.
          </p>
        )}
      </div>
    </aside>
  );
}

/** Mobile chrome: slim top bar + bottom tab bar. */
function MobileTopBar() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-hairline bg-canvas/85 px-4 backdrop-blur md:hidden">
      <Link href="/" aria-label="PromptForge home">
        <Wordmark />
      </Link>
      <div className="flex items-center gap-2">
        <ConnectivityDot />
        <button
          onClick={openPalette}
          aria-label="Open command palette"
          className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Search size={16} aria-hidden />
        </button>
      </div>
    </header>
  );
}

function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-40 grid grid-cols-5 border-t border-hairline bg-canvas/90 backdrop-blur md:hidden"
    >
      {NAV.map((item) => {
        const active = item.match(pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 pb-2 pt-2 text-[0.625rem] font-medium transition-colors ${
              active ? "text-ember" : "text-muted"
            }`}
          >
            <Icon size={18} strokeWidth={2.1} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="flex min-h-dvh">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopBar />
          <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-5 sm:px-8 sm:py-7">
            {children}
          </main>
          <MobileTabBar />
        </div>
        <CommandPalette />
      </div>
    </Providers>
  );
}
