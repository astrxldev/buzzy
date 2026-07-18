import { error } from "@sveltejs/kit";
import { command, getRequestEvent } from "$app/server";
import { z } from "zod";
import { adminCheck } from "@/lib/auth";
import {
  reloadDonationWidget,
  rejectLatestDonation,
  resendDonationPopup,
  resetDonationGoal,
  setDonationGoal,
  testDonationPopup,
} from "$lib/server/data";

async function requireAdmin() {
  const event = getRequestEvent();
  const user = await adminCheck(event.request.headers);
  if (!user) error(401, "Unauthorized");
  return user;
}

export const resendPopup = command(z.string(), async (id) => {
  const user = await requireAdmin();
  const result = await resendDonationPopup(id, user.name);
  if ("error" in result) error(404, result.error);
  return result;
});

export const testPopup = command(async () => {
  const user = await requireAdmin();
  return await testDonationPopup(user.name);
});

export const reloadWidget = command(async () => {
  const user = await requireAdmin();
  return await reloadDonationWidget(user.name);
});

export const resetGoal = command(async () => {
  const user = await requireAdmin();
  return await resetDonationGoal(user.name);
});

export const setGoal = command(z.number().nullable(), async (goal) => {
  const user = await requireAdmin();
  return await setDonationGoal(goal, user.name);
});

export const rejectDonation = command(z.string(), async (id) => {
  const user = await requireAdmin();
  return await rejectLatestDonation(id, user.name);
});
