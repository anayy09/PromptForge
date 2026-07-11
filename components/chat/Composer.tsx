"use client";

import { useCallback, useRef, useState } from "react";
import {
  Send,
  Square,
  Wand2,
  Paperclip,
  Mic,
  X,
  ImagePlus,
  Loader2,
  FileText,
  FileCode,
  File as FileIcon,
} from "lucide-react";

/** Metadata for any attached file (image or otherwise). */
export interface AttachedFile {
  /** data URL for images; raw text content for text-based files. */
  dataUrl: string;
  name: string;
  type: string;
  size: number;
  isImage: boolean;
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

// File types we can read as text and inject as context
const TEXT_TYPES = new Set([
  "text/plain",
  "text/html",
  "text/css",
  "text/csv",
  "text/markdown",
  "text/xml",
  "text/javascript",
  "text/x-python",
  "text/x-java-source",
  "text/x-c",
  "text/x-c++",
  "text/x-rust",
  "text/x-go",
  "text/x-typescript",
  "application/json",
  "application/xml",
  "application/javascript",
  "application/x-yaml",
  "application/x-sh",
  "application/sql",
]);

const TEXT_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".csv",
  ".json",
  ".xml",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".cfg",
  ".conf",
  ".log",
  ".env",
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
  ".bat",
  ".ps1",
  ".py",
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".java",
  ".c",
  ".cpp",
  ".h",
  ".hpp",
  ".cs",
  ".go",
  ".rs",
  ".rb",
  ".php",
  ".swift",
  ".kt",
  ".kts",
  ".scala",
  ".r",
  ".R",
  ".sql",
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".less",
  ".sass",
  ".vue",
  ".svelte",
  ".lua",
  ".pl",
  ".pm",
  ".dart",
  ".ex",
  ".exs",
  ".zig",
  ".nim",
  ".clj",
  ".hs",
  ".ml",
  ".erl",
  ".elm",
  ".gradle",
  ".makefile",
  ".dockerfile",
  ".gitignore",
  ".editorconfig",
]);

function isTextFile(file: File): boolean {
  if (TEXT_TYPES.has(file.type)) return true;
  const ext = file.name.includes(".") ? `.${file.name.split(".").pop()?.toLowerCase()}` : "";
  return TEXT_EXTENSIONS.has(ext);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(file: AttachedFile) {
  if (file.isImage) return null; // images show thumbnails
  const ext = file.name.includes(".") ? `.${file.name.split(".").pop()?.toLowerCase()}` : "";
  const codeExts = new Set([
    ".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".c", ".cpp", ".go",
    ".rs", ".rb", ".php", ".swift", ".kt", ".cs", ".html", ".css",
    ".scss", ".vue", ".svelte", ".sh", ".sql", ".json", ".xml", ".yaml",
    ".yml",
  ]);
  if (codeExts.has(ext)) return <FileCode size={16} aria-hidden />;
  const textExts = new Set([".txt", ".md", ".csv", ".log", ".env", ".toml", ".ini", ".cfg"]);
  if (textExts.has(ext)) return <FileText size={16} aria-hidden />;
  return <FileIcon size={16} aria-hidden />;
}

export function Composer({
  value,
  onChange,
  onSend,
  onStop,
  onImprove,
  streaming,
  attachments,
  onAttachFiles,
  onRemoveAttachment,
  canVoice,
  recording,
  transcribing,
  onMicToggle,
  imageMode,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  onImprove: () => void;
  streaming: boolean;
  attachments: AttachedFile[];
  onAttachFiles: (files: FileList) => void;
  onRemoveAttachment: (index: number) => void;
  canVoice: boolean;
  recording: boolean;
  transcribing: boolean;
  onMicToggle: () => void;
  imageMode: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const empty = value.trim().length === 0 && attachments.length === 0;

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer?.types?.includes("Files")) {
      setDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setDragging(false);
      if (e.dataTransfer?.files?.length) {
        onAttachFiles(e.dataTransfer.files);
      }
    },
    [onAttachFiles],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        // Has image files in clipboard
        const hasImages = Array.from(files).some((f) => f.type.startsWith("image/"));
        if (hasImages) {
          e.preventDefault();
          onAttachFiles(files);
        }
      }
    },
    [onAttachFiles],
  );

  const imageAttachments = attachments.filter((a) => a.isImage);
  const fileAttachments = attachments.filter((a) => !a.isImage);

  return (
    <div
      className={`relative rounded-2xl border bg-surface p-2 shadow-card transition-colors ${
        dragging
          ? "border-ember bg-ember/[0.04]"
          : "border-hairline"
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-ember/[0.06]">
          <div className="flex items-center gap-2 rounded-xl bg-surface px-4 py-2 text-sm font-medium text-ember shadow-card">
            <Paperclip size={16} aria-hidden />
            Drop files to attach
          </div>
        </div>
      )}

      {/* Image attachment thumbnails */}
      {imageAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1 pb-2 pt-1">
          {imageAttachments.map((att, i) => {
            const globalIdx = attachments.indexOf(att);
            return (
              <div key={i} className="group/img relative h-14 w-14 overflow-hidden rounded-lg border border-hairline">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={att.dataUrl} alt={att.name} className="h-full w-full object-cover" />
                <button
                  onClick={() => onRemoveAttachment(globalIdx)}
                  aria-label={`Remove ${att.name}`}
                  className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-canvas/85 text-ink opacity-0 transition-opacity hover:text-danger group-hover/img:opacity-100"
                >
                  <X size={11} aria-hidden />
                </button>
                <span className="absolute bottom-0 left-0 right-0 truncate bg-canvas/70 px-0.5 text-center text-[9px] text-faint">
                  {formatSize(att.size)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* File attachment chips */}
      {fileAttachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1 pb-2 pt-1">
          {fileAttachments.map((att, i) => {
            const globalIdx = attachments.indexOf(att);
            return (
              <div
                key={i}
                className="group/file flex items-center gap-1.5 rounded-lg border border-hairline bg-surface-2 px-2 py-1 text-xs text-ink-soft"
              >
                <span className="text-muted">{fileIcon(att)}</span>
                <span className="max-w-[120px] truncate font-medium">{att.name}</span>
                <span className="text-2xs tabular-nums text-faint">{formatSize(att.size)}</span>
                <button
                  onClick={() => onRemoveAttachment(globalIdx)}
                  aria-label={`Remove ${att.name}`}
                  className="ml-0.5 grid h-4 w-4 place-items-center rounded-full text-muted opacity-0 transition-opacity hover:text-danger group-hover/file:opacity-100"
                >
                  <X size={11} aria-hidden />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!streaming) onSend();
          }
        }}
        onPaste={handlePaste}
        rows={1}
        placeholder={
          imageMode ? "Describe an image to generate…" : "Message PromptForge Chat…"
        }
        spellCheck
        suppressHydrationWarning
        className="max-h-48 min-h-[44px] w-full resize-none bg-transparent px-2 py-2 text-sm leading-relaxed text-ink placeholder:text-faint focus:outline-none"
      />

      <div className="flex items-center gap-1.5 px-1 pb-0.5">
        {/* Always show attach button — text files work for any model */}
        <input
          ref={fileRef}
          type="file"
          accept="*/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) onAttachFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={attachments.length >= MAX_FILES}
          title={attachments.length >= MAX_FILES ? `Max ${MAX_FILES} files` : "Attach files"}
          aria-label="Attach files"
          className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-40"
        >
          <Paperclip size={16} aria-hidden />
        </button>

        {canVoice && (
          <button
            onClick={onMicToggle}
            disabled={transcribing}
            title={recording ? "Stop recording" : "Record a voice message"}
            aria-label={recording ? "Stop recording" : "Record a voice message"}
            className={`grid h-8 w-8 place-items-center rounded-full transition-colors disabled:opacity-50 ${
              recording ? "bg-danger/15 text-danger" : "text-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {transcribing ? (
              <Loader2 size={16} className="animate-spin" aria-hidden />
            ) : recording ? (
              <Square size={14} fill="currentColor" aria-hidden />
            ) : (
              <Mic size={16} aria-hidden />
            )}
          </button>
        )}

        <button
          onClick={onImprove}
          disabled={value.trim().length === 0}
          title="Rewrite this message with the Enhance tool"
          className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-2.5 py-1 text-2xs font-medium text-muted transition-colors hover:border-ember hover:text-ember disabled:opacity-40"
        >
          <Wand2 size={12} aria-hidden />
          Improve
        </button>

        <span className="ml-auto hidden text-2xs text-faint sm:inline">
          {recording ? (
            <span className="text-danger">recording…</span>
          ) : (
            <>
              <kbd className="rounded border border-hairline bg-surface px-1 py-0.5 font-mono">Enter</kbd> to
              send
            </>
          )}
        </span>

        {streaming ? (
          <button
            onClick={onStop}
            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full bg-surface-2 px-3.5 text-sm font-medium text-ink transition-colors hover:bg-hairline sm:ml-2"
          >
            <Square size={14} aria-hidden fill="currentColor" />
            Stop
          </button>
        ) : (
          <button
            onClick={onSend}
            disabled={empty}
            className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-ember text-on-ember shadow-soft transition-colors hover:bg-ember-strong disabled:opacity-40 sm:ml-2"
            aria-label={imageMode ? "Generate image" : "Send message"}
          >
            {imageMode ? <ImagePlus size={16} aria-hidden /> : <Send size={16} aria-hidden />}
          </button>
        )}
      </div>
    </div>
  );
}

export { MAX_FILES, MAX_FILE_SIZE, isTextFile, formatSize };
