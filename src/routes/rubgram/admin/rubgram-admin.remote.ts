import { error } from "@sveltejs/kit";
import { command, getRequestEvent } from "$app/server";
import { z } from "zod";
import { adminCheck } from "@/lib/auth";
import {
  addRubgramNote,
  bulkDeleteRubgram,
  callRubgramDiscord,
  createManualRubgramSubmission,
  debugUploadRubgramSlip,
  deleteRubgramNote,
  randomRubgramSubmission,
  setRubgramFree,
  setRubgramLimit,
  toggleRubgramCheck,
  toggleRubgramLock,
  toggleRubgramMonth,
  wipeRubgramSubmissions,
} from "$lib/server/data";

async function requireAdmin() {
  const event = getRequestEvent();
  const user = await adminCheck(event.request.headers);
  if (!user) error(401, "Unauthorized");
  return user;
}

export const toggleCheck = command(z.string(), async (id) => {
  const user = await requireAdmin();
  return await toggleRubgramCheck(id, user.name);
});

export const toggleLock = command(async () => {
  const user = await requireAdmin();
  return await toggleRubgramLock(user.name);
});

export const setLimit = command(z.number(), async (limit) => {
  const user = await requireAdmin();
  return await setRubgramLimit(limit, user.name);
});

export const setFree = command(z.number(), async (free) => {
  const user = await requireAdmin();
  return await setRubgramFree(free, user.name);
});

export const wipe = command(async () => {
  const user = await requireAdmin();
  return await wipeRubgramSubmissions(user.name);
});

export const random = command(async () => {
  await requireAdmin();
  return await randomRubgramSubmission();
});

export const bulkDelete = command(z.array(z.string()), async (ids) => {
  const user = await requireAdmin();
  return await bulkDeleteRubgram(ids, user.name);
});

export const addNote = command(
  z.object({ id: z.string(), text: z.string().min(1) }),
  async ({ id, text }) => {
    const user = await requireAdmin();
    return await addRubgramNote(id, text, user.name);
  },
);

export const deleteNote = command(
  z.object({ id: z.string(), noteId: z.string() }),
  async ({ id, noteId }) => {
    const user = await requireAdmin();
    return await deleteRubgramNote(id, noteId, user.name);
  },
);

export const discordCall = command(z.string(), async (id) => {
  await requireAdmin();
  return await callRubgramDiscord(id);
});

export const toggleMonth = command(z.string(), async (month) => {
  const user = await requireAdmin();
  return await toggleRubgramMonth(month, user.name);
});

export const debugUploadSlip = command(
  "unchecked",
  async ({ id, slip }: { id: string; slip: File }) => {
    const user = await requireAdmin();
    return await debugUploadRubgramSlip(id, slip, user.name);
  },
);

export const manualCreate = command(
  "unchecked",
  async (
    input: {
      name: string;
      price: number;
      services: string[];
      server: "as" | "eu" | "us" | "tw";
      discord: string;
      username: string;
      display: string;
      slip?: File | null;
    },
  ) => {
    const user = await requireAdmin();
    const result = await createManualRubgramSubmission(input, user.name);
    if ("error" in result) error(400, result.error);
    return result;
  },
);
