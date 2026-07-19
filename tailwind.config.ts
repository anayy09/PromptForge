import type { Config } from "tailwindcss";

/**
 * PromptForge design tokens. Colors are stored in globals.css as raw OKLCH
 * "L C H" triplets on :root and .dark, then referenced here with an alpha
 * channel so Tailwind opacity modifiers (bg-ember/10) keep working.
 *
 * Identity ("The Forge"): warm cream/anvil neutrals tinted toward the ember
 * hue, one signature ember (fire = the transform) and steel (metal = the
 * target model).
 */
const oklch = (v: string) => `oklch(var(${v}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: oklch("--canvas"),
        surface: oklch("--surface"),
        "surface-2": oklch("--surface-2"),
        sunken: oklch("--sunken"),
        raised: oklch("--raised"),
        scrim: oklch("--scrim"),
        hairline: oklch("--hairline"),
        "hairline-strong": oklch("--hairline-strong"),
        ink: oklch("--ink"),
        "ink-soft": oklch("--ink-soft"),
        muted: oklch("--muted"),
        faint: oklch("--faint"),
        ember: oklch("--ember"),
        "ember-strong": oklch("--ember-strong"),
        "ember-soft": oklch("--ember-soft"),
        steel: oklch("--steel"),
        "steel-soft": oklch("--steel-soft"),
        quench: oklch("--quench"),
        danger: oklch("--danger"),
        "on-ember": oklch("--on-ember"),
      },
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
        sans: ["var(--font-sans)", "var(--font-mono)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        // Softened scale: friendlier, more consumer-grade corners. Existing
        // `rounded` / `rounded-sm` usages inherit the larger radii automatically.
        sm: "6px",
        DEFAULT: "10px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "28px",
      },
      boxShadow: {
        // Low-contrast, warm-tinted elevation. Kept subtle so the UI feels
        // calm rather than "floaty".
        soft: "0 1px 2px oklch(0.2 0.02 50 / 0.04), 0 2px 8px oklch(0.2 0.02 50 / 0.05)",
        card: "0 2px 4px oklch(0.2 0.02 50 / 0.05), 0 8px 24px oklch(0.2 0.02 50 / 0.07)",
        lifted: "0 6px 16px oklch(0.2 0.02 50 / 0.08), 0 16px 40px oklch(0.2 0.02 50 / 0.10)",
        "ember-glow": "0 4px 16px oklch(var(--ember) / 0.28)",
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.02em" }],
      },
      letterSpacing: {
        brand: "0.16em",
      },
      keyframes: {
        "ember-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        "forge-sweep": {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(220%)" },
        },
        "rise-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "translateY(4px) scale(0.985)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(3px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "spark": {
          "0%": { opacity: "0", transform: "translateY(0) scale(1)" },
          "20%": { opacity: "1" },
          "100%": { opacity: "0", transform: "translateY(-14px) scale(0.4)" },
        },
      },
      animation: {
        "ember-pulse": "ember-pulse 1.6s ease-in-out infinite",
        "forge-sweep": "forge-sweep 1.1s cubic-bezier(0.22, 1, 0.36, 1) infinite",
        "rise-in": "rise-in 0.32s cubic-bezier(0.22, 1, 0.36, 1) both",
        "pop-in": "pop-in 0.18s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.22s ease-out both",
        "fade-up": "fade-up 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
