"use client";

import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";
import { useCopy } from "../useCopy";

function CodeBlock({ text }: { text: string }) {
  const { copied, copy } = useCopy();
  return (
    <div className="group relative my-2 overflow-hidden rounded-lg border border-hairline bg-sunken">
      <button
        onClick={() => copy(text)}
        className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-md border border-hairline bg-surface px-1.5 py-0.5 text-2xs text-muted opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
      >
        {copied ? <Check size={11} aria-hidden /> : <Copy size={11} aria-hidden />}
        {copied ? "copied" : "copy"}
      </button>
      <pre className="overflow-x-auto px-3 py-2.5 font-mono text-xs leading-relaxed text-ink">
        <code>{text}</code>
      </pre>
    </div>
  );
}

const COMPONENTS: Components = {
  // Let CodeBlock own the <pre>; the default pre would otherwise nest.
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children }) => {
    const text = String(children ?? "");
    const isBlock = /language-/.test(className ?? "") || text.includes("\n");
    if (!isBlock) {
      return (
        <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.85em] text-ink">
          {children}
        </code>
      );
    }
    return <CodeBlock text={text.replace(/\n$/, "")} />;
  },
  p: ({ children }) => <p className="my-2 leading-relaxed first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 ml-5 list-disc space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 ml-5 list-decimal space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-ember underline underline-offset-2 hover:text-ember-strong"
    >
      {children}
    </a>
  ),
  h1: ({ children }) => <h1 className="mb-2 mt-3 text-base font-bold text-ink first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-3 text-sm font-bold text-ink first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1 mt-2 text-sm font-semibold text-ink first:mt-0">{children}</h3>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-hairline-strong pl-3 text-ink-soft">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-hairline bg-surface-2 px-2 py-1 text-left font-semibold">{children}</th>
  ),
  td: ({ children }) => <td className="border border-hairline px-2 py-1">{children}</td>,
  hr: () => <hr className="my-3 border-hairline" />,
};

export const Markdown = memo(function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm text-ink">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
        {children}
      </ReactMarkdown>
    </div>
  );
});
