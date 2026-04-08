import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const b2s = (t: number) => {
  let e = (Math.log2(t) / 10) | 0;
  return `${(t / 1024 ** (e = e <= 0 ? 0 : e)).toFixed(1)}${" KMGP"[e]}B`;
};

type Node = { count: number; next: Map<string, Node> };

function node(): Node {
  return { count: 0, next: new Map() };
}

// find unique shortest code for each string
export function shortestPrefixes(values: readonly string[]) {
  const uniq = [...new Set(values)];
  const root = node();

  for (const v of uniq) {
    let cur = root;
    for (const ch of v) {
      let n = cur.next.get(ch);
      if (!n) cur.next.set(ch, (n = node()));
      n.count++;
      cur = n;
    }
  }

  const res = new Map<string, string>();
  for (const v of uniq) {
    let cur = root;
    let prefix = "";
    for (const ch of v) {
      const n = cur.next.get(ch)!;
      prefix += ch;
      if (n.count === 1) break;
      cur = n;
    }
    res.set(v, prefix);
  }

  return res;
}

export function parseSearchNumber(
  param: string | string[] | undefined,
  def: number = 0,
) {
  if (Array.isArray(param)) return parseSearchNumber(param[0], def);
  const parsed = parseFloat(param ?? "");
  return Number.isNaN(parsed) ? def : parsed;
}

export function parseSearchString(
  param: string | string[] | undefined,
  def: string = "",
) {
  if (Array.isArray(param)) return parseSearchString(param[0], def);
  return param ?? def;
}
