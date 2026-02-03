"use client";

export function genId({ name }: { name: string; id: string }) {
  const generated = name
    .toLowerCase()
    .slice(0, 3)
    .replace(/[^a-z0-9]+/g, "");
  return { id: generated };
}
