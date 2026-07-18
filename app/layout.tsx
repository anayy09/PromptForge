import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PromptForge — better prompts, and a place to use them",
  description:
    "Enhance turns rough prompts into clear, model-ready ones. Chat is an everyday multimodal assistant. Two tools, one workspace.",
  applicationName: "PromptForge",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfcfb" },
    { media: "(prefers-color-scheme: dark)", color: "#2a2523" },
  ],
};

// Applies persisted theme + appearance (accent hue, density, motion) before
// first paint to avoid a flash. Hues must match ACCENT_PRESETS in lib/storage.
const themeInit = `(function(){try{var s=JSON.parse(localStorage.getItem('promptforge.settings.v2')||'{}');var r=document.documentElement;var t=s.theme||'system';r.classList.toggle('dark',t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches));var H={ember:46,magma:25,brass:75,verdigris:165,steel:245,violet:305};if(s.accent&&H[s.accent])r.style.setProperty('--accent-h',String(H[s.accent]));if(s.density==='compact'||s.density==='relaxed')r.setAttribute('data-density',s.density);if(s.motion==='reduced')r.setAttribute('data-motion','reduced');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mono.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
