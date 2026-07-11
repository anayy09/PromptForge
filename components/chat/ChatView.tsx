"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ChatModelPicker } from "./ChatModelPicker";
import { Composer, MAX_FILES, MAX_FILE_SIZE, isTextFile, type AttachedFile } from "./Composer";
import { MessageBubble } from "./MessageBubble";
import { ConversationSidebar } from "./ConversationSidebar";
import {
  getChatModels,
  getById,
  supportsVision,
  isImageModel,
  getSpeechModel,
  getTranscribeModel,
} from "@/lib/registry";
import {
  newId,
  saveConversation,
  getConversations,
  deleteConversation,
  type Conversation,
  type ChatTurn,
} from "@/lib/storage";

// Preference order for the default everyday chat model. Gemma 4 is the primary
// default — multimodal, 256K context, well-priced. Falls back through the list
// if the registry does not include a given model.
const CHAT_DEFAULTS = [
  "gemma-4-31b-it",
  "gpt-oss-120b",
  "llama-3.3-70b-instruct",
  "gpt-oss-20b",
];
function defaultChatModel(): string {
  const models = getChatModels();
  for (const id of CHAT_DEFAULTS) if (models.some((m) => m.id === id)) return id;
  return models[0]?.id ?? "";
}

function titleFrom(text: string, fallback = "New chat"): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return fallback;
  return t.length > 48 ? `${t.slice(0, 48)}…` : t;
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

const LOAD_KEY = "promptforge.load";

export function ChatView() {
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [modelId, setModelId] = useState<string>("");
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const createdAtRef = useRef<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Capabilities are static (driven by which models the registry ships).
  const canTranscribe = useMemo(() => !!getTranscribeModel(), []);
  const canTts = useMemo(() => !!getSpeechModel(), []);
  const imageMode = isImageModel(modelId);
  const visionCapable = supportsVision(modelId);

  // Seed default model + load conversation list once.
  useEffect(() => {
    setModelId(defaultChatModel());
    getConversations().then(setConversations).catch(() => {});
  }, []);

  // Auto-scroll to the newest content while it streams.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // When switching to image-gen mode, drop all attachments (not applicable).
  useEffect(() => {
    if (imageMode) setAttachments([]);
  }, [imageMode]);

  const newChat = useCallback(() => {
    abortRef.current?.abort();
    setActiveId(null);
    setMessages([]);
    setInput("");
    setAttachments([]);
    setError(null);
    createdAtRef.current = 0;
  }, []);

  const selectConversation = useCallback(
    (id: string) => {
      const conv = conversations.find((c) => c.id === id);
      if (!conv) return;
      abortRef.current?.abort();
      setActiveId(conv.id);
      setMessages(conv.messages);
      setModelId(conv.modelId || defaultChatModel());
      createdAtRef.current = conv.createdAt;
      setAttachments([]);
      setError(null);
    },
    [conversations],
  );

  const removeConversation = useCallback(
    async (id: string) => {
      await deleteConversation(id).catch(() => {});
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (id === activeId) newChat();
    },
    [activeId, newChat],
  );

  const persist = useCallback(
    async (finalMessages: ChatTurn[], id: string, createdAt: number) => {
      const firstUser = finalMessages.find((m) => m.role === "user");
      const hasAttachments = firstUser?.attachments?.length || firstUser?.files?.length;
      const conv: Conversation = {
        id,
        title: titleFrom(firstUser?.content ?? "", hasAttachments ? "File chat" : "New chat"),
        createdAt,
        updatedAt: Date.now(),
        modelId,
        messages: finalMessages,
      };
      await saveConversation(conv).catch(() => {});
      setConversations((prev) => [conv, ...prev.filter((c) => c.id !== id)]);
    },
    [modelId],
  );

  // Handle attaching files — reads images as data URLs, text files as text.
  const attach = useCallback(async (files: FileList) => {
    const results: AttachedFile[] = [];
    for (const f of Array.from(files)) {
      if (f.size > MAX_FILE_SIZE) continue; // skip oversized files

      if (f.type.startsWith("image/")) {
        try {
          const dataUrl = await readFileAsDataURL(f);
          results.push({ dataUrl, name: f.name, type: f.type, size: f.size, isImage: true });
        } catch {
          /* skip unreadable file */
        }
      } else if (isTextFile(f)) {
        try {
          const content = await readFileAsText(f);
          results.push({ dataUrl: content, name: f.name, type: f.type, size: f.size, isImage: false });
        } catch {
          /* skip unreadable file */
        }
      }
      // Silently skip binary files we can't handle
    }
    if (results.length) {
      setAttachments((prev) => [...prev, ...results].slice(0, MAX_FILES));
    }
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if ((!text && attachments.length === 0) || streaming || !modelId) return;

    const convId = activeId ?? newId();
    const createdAt = createdAtRef.current || Date.now();
    createdAtRef.current = createdAt;
    if (!activeId) setActiveId(convId);

    // Separate image and file attachments
    const imageUrls = attachments.filter((a) => a.isImage).map((a) => a.dataUrl);
    const fileData = attachments
      .filter((a) => !a.isImage)
      .map((a) => ({ name: a.name, type: a.type, size: a.size, content: a.dataUrl }));

    const userTurn: ChatTurn = {
      id: newId(),
      role: "user",
      content: text,
      ts: Date.now(),
      attachments: imageUrls.length ? imageUrls : undefined,
      files: fileData.length ? fileData : undefined,
    };
    const assistantId = newId();
    const modelName = getById(modelId)?.name;
    const assistantTurn: ChatTurn = {
      id: assistantId,
      role: "assistant",
      content: "",
      ts: Date.now(),
      modelName,
    };

    const base = [...messages, userTurn];
    setMessages([...base, assistantTurn]);
    setInput("");
    setAttachments([]);
    setError(null);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    // ---- Image generation mode ----
    if (imageMode) {
      try {
        const res = await fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({ modelId, prompt: text }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Image generation failed.");
          setMessages(base);
          return;
        }
        const finalMessages: ChatTurn[] = [...base, { ...assistantTurn, images: [data.image] }];
        setMessages(finalMessages);
        await persist(finalMessages, convId, createdAt);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          setError("Network error. Please try again.");
          setMessages(base);
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
      return;
    }

    // ---- Text / vision / file chat (streaming) ----
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          modelId,
          messages: base.map((m) => ({
            role: m.role,
            content: m.content,
            // Only send images if the model supports vision
            images: m.role === "user" && visionCapable ? m.attachments : undefined,
            // Always send file context (injected as text server-side)
            files: m.role === "user" ? m.files : undefined,
          })),
        }),
      });

      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "The chat request failed. Please try again.");
        setMessages(base);
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const snapshot = acc;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: snapshot } : m)),
        );
      }

      const finalMessages: ChatTurn[] = [...base, { ...assistantTurn, content: acc }];
      setStreaming(false);
      abortRef.current = null;
      await persist(finalMessages, convId, createdAt);
    } catch (err) {
      setStreaming(false);
      abortRef.current = null;
      if ((err as Error)?.name === "AbortError") {
        setMessages((prev) => {
          void persist(prev, convId, createdAt);
          return prev;
        });
      } else {
        setError("Network error. Please try again.");
        setMessages(base);
      }
    }
  }, [input, attachments, streaming, modelId, activeId, messages, imageMode, visionCapable, persist]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  // ---- Voice input (record -> Whisper) ----
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setTranscribing(true);
        try {
          const form = new FormData();
          form.append("audio", blob, "recording.webm");
          const res = await fetch("/api/transcribe", { method: "POST", body: form });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error ?? "Could not transcribe the recording.");
          } else if (data.text) {
            setInput((prev) => (prev ? `${prev} ${data.text}` : data.text));
          }
        } catch {
          setError("Could not reach the transcription service.");
        } finally {
          setTranscribing(false);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError("Microphone access was blocked.");
    }
  }, []);

  const toggleMic = useCallback(() => {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
    } else {
      void startRecording();
    }
  }, [recording, startRecording]);

  // Hand the current draft to the Enhance tool, then navigate there.
  const improve = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    try {
      sessionStorage.setItem(LOAD_KEY, JSON.stringify({ rawPrompt: text }));
    } catch {
      /* ignore */
    }
    router.push("/");
  }, [input, router]);

  const empty = messages.length === 0;

  return (
    <div className="grid h-[calc(100dvh-11rem)] min-h-[420px] grid-cols-1 gap-4 lg:grid-cols-[15rem_1fr]">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:block">
        <ConversationSidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={selectConversation}
          onNew={newChat}
          onDelete={removeConversation}
        />
      </aside>

      {/* Main column */}
      <div className="flex min-h-0 flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="w-full max-w-xs">
            <ChatModelPicker value={modelId} onChange={setModelId} />
          </div>
          <button
            onClick={newChat}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:text-ink lg:hidden"
          >
            <Plus size={14} aria-hidden />
            New
          </button>
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto rounded-2xl">
          {empty ? (
            <EmptyChat imageMode={imageMode} onPick={(t) => setInput(t)} />
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-5 px-1 py-2">
              {messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  turn={m}
                  canVoice={canTts}
                  streaming={
                    streaming && m.role === "assistant" && m.id === messages[messages.length - 1].id
                  }
                />
              ))}
              {error && (
                <p className="rounded-lg border border-danger/40 bg-danger/[0.06] px-3 py-2 text-xs text-danger">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mx-auto w-full max-w-3xl">
          <Composer
            value={input}
            onChange={setInput}
            onSend={send}
            onStop={stop}
            onImprove={improve}
            streaming={streaming}
            attachments={attachments}
            onAttachFiles={attach}
            onRemoveAttachment={(i) => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
            canVoice={canTranscribe}
            recording={recording}
            transcribing={transcribing}
            onMicToggle={toggleMic}
            imageMode={imageMode}
          />
          <p className="mt-1.5 text-center text-2xs text-faint">
            {imageMode
              ? "Describe a picture and it will be generated. Switch models to chat."
              : "Chat answers your messages. To sharpen a prompt instead, use Enhance."}
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyChat({ imageMode, onPick }: { imageMode: boolean; onPick: (text: string) => void }) {
  const chatSuggestions = [
    "Explain how compound interest works with a simple example",
    "Draft a polite message to reschedule a dentist appointment",
    "Give me a 20-minute beginner workout with no equipment",
    "Summarize the pros and cons of electric cars",
  ];
  const imageSuggestions = [
    "A cozy reading nook by a rainy window, warm lamplight",
    "Minimalist logo for a mountain coffee roastery",
    "A watercolor fox sitting in an autumn forest",
    "Retro travel poster of a coastal town at sunset",
  ];
  const suggestions = imageMode ? imageSuggestions : chatSuggestions;

  return (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-ember/10 text-ember">
        <Plus size={22} aria-hidden className="rotate-45" />
      </div>
      <h2 className="text-lg font-semibold text-ink">
        {imageMode ? "Describe an image" : "How can I help?"}
      </h2>
      <p className="mt-1 max-w-md text-sm text-muted">
        {imageMode
          ? "Type a description and it will be turned into a picture."
          : "An everyday assistant for quick tasks. Pick a starting point or just type below."}
      </p>
      <div className="mt-5 grid w-full max-w-xl gap-2 sm:grid-cols-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-xl border border-hairline bg-surface px-3.5 py-2.5 text-left text-xs leading-relaxed text-ink-soft shadow-soft transition-colors hover:border-ember hover:text-ink"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
