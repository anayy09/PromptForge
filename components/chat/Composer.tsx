"use client";

import { useRef } from "react";
import { Send, Square, Wand2, Paperclip, Mic, X, ImagePlus, Loader2 } from "lucide-react";

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
  canAttach,
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
  attachments: string[];
  onAttachFiles: (files: FileList) => void;
  onRemoveAttachment: (index: number) => void;
  canAttach: boolean;
  canVoice: boolean;
  recording: boolean;
  transcribing: boolean;
  onMicToggle: () => void;
  imageMode: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const empty = value.trim().length === 0 && attachments.length === 0;

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-2 shadow-card">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1 pb-2 pt-1">
          {attachments.map((src, i) => (
            <div key={i} className="relative h-14 w-14 overflow-hidden rounded-lg border border-hairline">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Attachment ${i + 1}`} className="h-full w-full object-cover" />
              <button
                onClick={() => onRemoveAttachment(i)}
                aria-label="Remove attachment"
                className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-canvas/85 text-ink hover:text-danger"
              >
                <X size={11} aria-hidden />
              </button>
            </div>
          ))}
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
        rows={1}
        placeholder={
          imageMode ? "Describe an image to generate…" : "Message PromptForge Chat…"
        }
        spellCheck
        suppressHydrationWarning
        className="max-h-48 min-h-[44px] w-full resize-none bg-transparent px-2 py-2 text-sm leading-relaxed text-ink placeholder:text-faint focus:outline-none"
      />

      <div className="flex items-center gap-1.5 px-1 pb-0.5">
        {canAttach && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) onAttachFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              title="Attach an image"
              aria-label="Attach an image"
              className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <Paperclip size={16} aria-hidden />
            </button>
          </>
        )}

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
