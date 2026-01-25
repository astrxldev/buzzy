"use client";

export function genId({ name, prefix }: { name: string; prefix: string }) {
  console.log(name, prefix)
  const generated = name.toLowerCase().replace(/[^a-z0-9]+/g, "") + (name.length ? rot13(prefix) : "");
  return { id: generated };
}

function rot13(str: string) {
  const shift = 13;
  let res = "";
  for (const c of str) res += String.fromCharCode(((c.toLowerCase().charCodeAt(0) - 97 + shift) % 26) + 97)
  return res;
}