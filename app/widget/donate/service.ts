import { requireWidgetCredential } from "@/app/(ui)/donate/service";

type WidgetEvent = {
  distinctId: string;
  event: string;
  properties: Record<string, unknown>;
};

export async function markDonationRunning(
  id: string,
  credential: string | null | undefined,
  dependencies: {
    configuredCredential?: string;
    updateLastPing: (id: string, at: Date) => Promise<unknown>;
    capture: (event: WidgetEvent) => unknown;
    now: () => Date;
  },
) {
  requireWidgetCredential(credential, dependencies.configuredCredential);
  dependencies.capture({
    distinctId: id,
    event: "donation_widget_state_playing",
    properties: { donation_id: id },
  });
  await dependencies.updateLastPing(id, dependencies.now());
}

export async function markDonationDone(
  id: string,
  credential: string | null | undefined,
  dependencies: {
    configuredCredential?: string;
    markSent: (id: string) => Promise<unknown>;
    capture: (event: WidgetEvent) => unknown;
  },
) {
  requireWidgetCredential(credential, dependencies.configuredCredential);
  dependencies.capture({
    distinctId: id,
    event: "donation_widget_state_shown",
    properties: { donation_id: id },
  });
  await dependencies.markSent(id);
}

export function getTopDonation<T>(dependencies: {
  findTopDonation: () => Promise<T | undefined>;
}) {
  return dependencies.findTopDonation();
}

export async function getDonationGoal(dependencies: {
  getGoalStart: () => Promise<Date | null | undefined>;
  sumSince: (starting: Date) => Promise<string | null>;
  getGoal: () => Promise<number | null>;
}) {
  const starting = (await dependencies.getGoalStart()) ?? new Date(0);
  const [amount, goal] = await Promise.all([
    dependencies.sumSince(starting),
    dependencies.getGoal(),
  ]);
  return { amount, goal };
}
