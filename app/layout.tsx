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

// Applies the persisted theme before first paint to avoid a flash.
const themeInit = `(function(){try{var s=localStorage.getItem('promptforge.settings.v1');var t=s?JSON.parse(s).theme:'system';var d=t==='dark'||((!t||t==='system')&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

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
