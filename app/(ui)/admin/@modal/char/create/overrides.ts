"use client";

export function genId({ name }: { name: string; id: string }) {
  const generated = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return { id: generated };
}
