import { error } from "@sveltejs/kit";
import { command, getRequestEvent } from "$app/server";
import { z } from "zod";
import { adminCheck } from "@/lib/auth";
import {
  randomArtifactSubmission,
  revalidateArtifactCard,
  setArtifactLimit,
  toggleArtifactCheck,
  toggleArtifactLock,
  wipeArtifactSubmissions,
} from "$lib/server/data";

async function requireAdmin() {
  const event = getRequestEvent();
  const user = await adminCheck(event.request.headers);
  if (!user) error(401, "Unauthorized");
  return user;
}

export const toggleCheck = command(z.string(), async (id) => {
  const user = await requireAdmin();
  return await toggleArtifactCheck(id, user.name);
});

export const toggleLock = command(async () => {
  const user = await requireAdmin();
  return await toggleArtifactLock(user.name);
});

export const setLimit = command(z.number(), async (limit) => {
  const user = await requireAdmin();
  return await setArtifactLimit(limit, user.name);
});

export const wipe = command(async () => {
  const user = await requireAdmin();
  return await wipeArtifactSubmissions(user.name);
});

export const random = command(async () => {
  await requireAdmin();
  return await randomArtifactSubmission();
});

export const revalidateCard = command(z.string(), async (id) => {
  const user = await requireAdmin();
  return await revalidateArtifactCard(id, user.name);
});
