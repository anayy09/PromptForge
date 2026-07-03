/**
 * Rough token estimate for pre-call cost preview and as a fallback when the
 * endpoint omits a usage object. Not a real tokenizer: a blended char/word
 * heuristic that tracks BPE counts within ~15% for English prose and code,
 * which is enough for a cost badge. When used as a fallback, the UI marks the
 * cost as approximate.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const chars = text.length;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  // Average of a chars/4 estimate and a words*1.33 estimate.
  const byChars = chars / 4;
  const byWords = words * 1.33;
  return Math.max(1, Math.round((byChars + byWords) / 2));
}

export function estimatePromptTokens(system: string, user: string): number {
  // +8 for chat formatting overhead per message.
  return estimateTokens(system) + estimateTokens(user) + 16;
}
