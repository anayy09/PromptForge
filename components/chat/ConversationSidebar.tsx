"use client";

import { Plus, MessageSquare, Trash2 } from "lucide-react";
import type { Conversation } from "@/lib/storage";
import { relativeTime } from "@/lib/format";

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex h-full flex-col gap-2">
      <button
        onClick={onNew}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-hairline bg-surface px-3 py-2 text-sm font-medium text-ink shadow-soft transition-colors hover:border-ember hover:text-ember"
      >
        <Plus size={15} aria-hidden />
        New chat
      </button>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="px-2 py-3 text-2xs text-faint">No conversations yet.</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {conversations.map((c) => {
              const active = c.id === activeId;
              return (
                <li key={c.id} className="group relative">
                  <button
                    onClick={() => onSelect(c.id)}
                    className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                      active ? "bg-surface-2 text-ink" : "text-muted hover:bg-surface-2 hover:text-ink"
                    }`}
                  >
                    <MessageSquare size={13} className="mt-0.5 shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1 pr-5">
                      <span className="block truncate">{c.title || "Untitled"}</span>
                      <span className="block text-2xs text-faint">{relativeTime(c.updatedAt)}</span>
                    </span>
                  </button>
                  <button
                    onClick={() => onDelete(c.id)}
                    title="Delete conversation"
                    aria-label="Delete conversation"
                    className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-faint opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                  >
                    <Trash2 size={13} aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
