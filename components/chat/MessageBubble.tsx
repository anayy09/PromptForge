"use client";

import { useRef, useState } from "react";
import {
  Wand2,
  Copy,
  Check,
  Volume2,
  Loader2,
  Download,
  FileText,
  FileCode,
  File as FileIcon,
} from "lucide-react";
import type { ChatTurn } from "@/lib/storage";
import { Markdown } from "./Markdown";
import { useCopy } from "../useCopy";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileChipIcon(name: string) {
  const ext = name.includes(".") ? `.${name.split(".").pop()?.toLowerCase()}` : "";
  const codeExts = new Set([
    ".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".c", ".cpp", ".go",
    ".rs", ".rb", ".php", ".swift", ".kt", ".cs", ".html", ".css",
    ".scss", ".vue", ".svelte", ".sh", ".sql", ".json", ".xml", ".yaml",
    ".yml",
  ]);
  if (codeExts.has(ext)) return <FileCode size={14} aria-hidden />;
  const textExts = new Set([".txt", ".md", ".csv", ".log", ".env", ".toml", ".ini", ".cfg"]);
  if (textExts.has(ext)) return <FileText size={14} aria-hidden />;
  return <FileIcon size={14} aria-hidden />;
}

function ImageGrid({ images, downloadable }: { images: string[]; downloadable?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {images.map((src, i) => (
        <div key={i} className="group/img relative overflow-hidden rounded-xl border border-hairline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={`Image ${i + 1}`} className="max-h-72 max-w-full object-contain" />
          {downloadable && (
            <a
              href={src}
              download={`promptforge-image-${i + 1}.png`}
              title="Download image"
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-canvas/85 text-ink opacity-0 transition-opacity hover:text-ember group-hover/img:opacity-100"
            >
              <Download size={14} aria-hidden />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function FileChips({
  files,
}: {
  files: { name: string; type: string; size: number; content: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {files.map((f, i) => (
        <div
          key={i}
          className="flex items-center gap-1.5 rounded-lg border border-hairline bg-surface-2 px-2 py-1 text-xs text-ink-soft"
        >
          <span className="text-muted">{fileChipIcon(f.name)}</span>
          <span className="max-w-[140px] truncate font-medium">{f.name}</span>
          <span className="text-2xs tabular-nums text-faint">{formatSize(f.size)}</span>
        </div>
      ))}
    </div>
  );
}

export function MessageBubble({
  turn,
  streaming,
  canVoice,
}: {
  turn: ChatTurn;
  streaming?: boolean;
  canVoice?: boolean;
}) {
  const { copied, copy } = useCopy();
  const [tts, setTts] = useState<"idle" | "loading" | "playing">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleTts = async () => {
    if (tts === "playing") {
      audioRef.current?.pause();
      setTts("idle");
      return;
    }
    setTts("loading");
    try {
      const res = await fetch("/api/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: turn.content }),
      });
      if (!res.ok) throw new Error("tts failed");
      const url = URL.createObjectURL(await res.blob());
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setTts("idle");
        URL.revokeObjectURL(url);
      };
      await audio.play();
      setTts("playing");
    } catch {
      setTts("idle");
    }
  };

  if (turn.role === "user") {
    return (
      <div className="flex animate-rise-in flex-col items-end gap-1.5">
        {turn.attachments && turn.attachments.length > 0 && (
          <div className="max-w-[85%]">
            <ImageGrid images={turn.attachments} />
          </div>
        )}
        {turn.files && turn.files.length > 0 && (
          <div className="max-w-[85%]">
            <FileChips files={turn.files} />
          </div>
        )}
        {turn.content && (
          <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-xl border border-ember/15 bg-ember/[0.07] px-3.5 py-2 text-sm leading-relaxed text-ink">
            {turn.content}
          </div>
        )}
      </div>
    );
  }

  const hasImages = turn.images && turn.images.length > 0;

  return (
    <div className="group flex animate-rise-in gap-3">
      <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ember/12 text-ember">
        <Wand2 size={14} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        {hasImages && <ImageGrid images={turn.images!} downloadable />}
        {turn.content ? (
          <Markdown>{turn.content}</Markdown>
        ) : (
          !hasImages &&
          streaming && (
            <span className="inline-flex gap-1 py-1.5" aria-label="Assistant is working">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 animate-ember-pulse rounded-full bg-muted"
                  style={{ animationDelay: `${i * 160}ms` }}
                />
              ))}
            </span>
          )
        )}
        <div className="mt-1 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          {turn.modelName && <span className="text-2xs text-faint">{turn.modelName}</span>}
          {turn.content && !streaming && (
            <>
              <button
                onClick={() => copy(turn.content)}
                className="inline-flex items-center gap-1 text-2xs text-muted hover:text-ink"
              >
                {copied ? <Check size={11} aria-hidden /> : <Copy size={11} aria-hidden />}
                {copied ? "copied" : "copy"}
              </button>
              {canVoice && (
                <button
                  onClick={toggleTts}
                  className="inline-flex items-center gap-1 text-2xs text-muted hover:text-ink"
                  title="Read aloud"
                >
                  {tts === "loading" ? (
                    <Loader2 size={11} className="animate-spin" aria-hidden />
                  ) : (
                    <Volume2 size={11} aria-hidden />
                  )}
                  {tts === "playing" ? "stop" : "read"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
