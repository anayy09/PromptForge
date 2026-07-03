/**
 * Word-level diff between the raw prompt and the enhanced prompt, used by the
 * output's Diff tab so a rewrite is auditable at a glance. Standard LCS over
 * whitespace-delimited tokens; separators are kept so output reconstructs.
 */
export type DiffOp = { type: "eq" | "add" | "del"; text: string };

function tokenize(s: string): string[] {
  // Keep whitespace runs as their own tokens so spacing survives.
  return s.split(/(\s+)/).filter((t) => t.length > 0);
}

export function diffWords(before: string, after: string): DiffOp[] {
  const a = tokenize(before);
  const b = tokenize(after);
  const n = a.length;
  const m = b.length;

  // LCS length table.
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  const push = (type: DiffOp["type"], text: string) => {
    const last = ops[ops.length - 1];
    if (last && last.type === type) last.text += text;
    else ops.push({ type, text });
  };

  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push("eq", a[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push("del", a[i]);
      i++;
    } else {
      push("add", b[j]);
      j++;
    }
  }
  while (i < n) push("del", a[i++]);
  while (j < m) push("add", b[j++]);

  return ops;
}

/** Summary counts for a diff, for a compact "+n / -m words" label. */
export function diffStats(ops: DiffOp[]): { added: number; removed: number } {
  const count = (t: DiffOp["type"]) =>
    ops
      .filter((o) => o.type === t)
      .reduce((acc, o) => acc + o.text.trim().split(/\s+/).filter(Boolean).length, 0);
  return { added: count("add"), removed: count("del") };
}
