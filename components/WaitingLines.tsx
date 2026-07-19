"use client";

import { useEffect, useState } from "react";

/**
 * Rotating one-liners for wait states. Plays the stage lines once (what the
 * tool is doing right now), then cycles genuinely useful prompting tips so a
 * longer wait teaches something instead of repeating a spinner.
 */

const ENHANCE_STAGES = [
  "Reading your prompt…",
  "Finding the real ask…",
  "Adding structure where it helps…",
  "Tightening the wording…",
  "Recording assumptions…",
];

const CHAT_STAGES = ["Reading your message…", "Thinking it through…", "Writing…"];

const TIPS = [
  "Concrete nouns beat adjectives: “a 3-column pricing table” outperforms “a nice layout”.",
  "One worked example in a prompt often beats three paragraphs of instructions.",
  "Models weight the start and end of a prompt most; bury nothing important in the middle.",
  "Asking for step-by-step reasoning measurably improves math and logic answers.",
  "“Answer in JSON” works best with a tiny example of the exact shape you want.",
  "Vague asks get average answers: models regress to the most common interpretation.",
  "Constraints sharpen output: a word limit, a fixed palette, a banned phrase.",
  "Models cannot see your screen. Paste the error, not a description of it.",
  "Naming the audience (“explain to a new hire”) sets depth better than “keep it simple”.",
  "A role helps only when it changes perspective: “as a security reviewer” does; “as a genius” does not.",
  "Ending a prompt with the output format is a strong anchor: models finish what the end asks for.",
  "Telling a model what to avoid works best as a short list, not a lecture.",
];

export function WaitingLines({
  variant = "enhance",
  withTips = true,
  className = "",
}: {
  variant?: "enhance" | "chat";
  withTips?: boolean;
  className?: string;
}) {
  const stages = variant === "chat" ? CHAT_STAGES : ENHANCE_STAGES;
  const [index, setIndex] = useState(0);
  // Start the tip rotation at a random point so repeat waits feel fresh.
  const [seq] = useState<string[]>(() => {
    if (!withTips) return stages;
    const start = Math.floor(Math.random() * TIPS.length);
    return [...stages, ...TIPS.map((_, k) => TIPS[(start + k) % TIPS.length])];
  });

  useEffect(() => {
    const loopStart = withTips ? stages.length : 0;
    const t = setInterval(
      () => setIndex((i) => (i + 1 < seq.length ? i + 1 : loopStart)),
      2600,
    );
    return () => clearInterval(t);
  }, [seq.length, stages.length, withTips]);

  const isTip = withTips && index >= stages.length;

  return (
    <span
      key={index}
      aria-live="polite"
      className={`block animate-fade-up text-xs leading-relaxed text-muted ${className}`}
    >
      {isTip && <span className="mr-1.5 font-medium text-ember">Tip</span>}
      {seq[index]}
    </span>
  );
}
