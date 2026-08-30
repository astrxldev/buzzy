import { describe, expect, mock, test } from "bun:test";
import {
  getDonationGoal,
  getTopDonation,
  markDonationDone,
  markDonationRunning,
} from "./service";

describe("donation widget state", () => {
  test.each([
    undefined,
    "",
    "wrong",
  ])("rejects running mutation with credential %p before side effects", async (credential) => {
    const capture = mock(() => {});
    const updateLastPing = mock(async () => {});
    await expect(
      markDonationRunning("id", credential, {
        configuredCredential: "secret",
        capture,
        updateLastPing,
        now: () => new Date(0),
      }),
    ).rejects.toThrow("Unauthorized");
    expect(capture).not.toHaveBeenCalled();
    expect(updateLastPing).not.toHaveBeenCalled();
  });

  test("rejects mutation when the server credential is not configured", async () => {
    await expect(
      markDonationDone("id", "secret", {
        capture: mock(() => {}),
        markSent: mock(async () => {}),
      }),
    ).rejects.toThrow("Unauthorized");
  });

  test("marks a credentialed donation as running and captures analytics", async () => {
    const at = new Date("2026-01-01T00:00:00Z");
    const capture = mock(() => {});
    const updateLastPing = mock(async () => {});
    await markDonationRunning("donation-1", "secret", {
      configuredCredential: "secret",
      capture,
      updateLastPing,
      now: () => at,
    });
    expect(updateLastPing).toHaveBeenCalledWith("donation-1", at);
    expect(capture).toHaveBeenCalledWith({
      distinctId: "donation-1",
      event: "donation_widget_state_playing",
      properties: { donation_id: "donation-1" },
    });
  });

  test("marks a credentialed donation done and captures analytics", async () => {
    const capture = mock(() => {});
    const markSent = mock(async () => {});
    await markDonationDone("donation-1", "secret", {
      configuredCredential: "secret",
      capture,
      markSent,
    });
    expect(markSent).toHaveBeenCalledWith("donation-1");
    expect(capture).toHaveBeenCalledWith({
      distinctId: "donation-1",
      event: "donation_widget_state_shown",
      properties: { donation_id: "donation-1" },
    });
  });
});

describe("donation widget aggregation", () => {
  test("returns the top donor selected by the aggregate dependency", async () => {
    const findTopDonation = mock(async () => ({ name: "Buzz", amount: "125" }));
    expect(await getTopDonation({ findTopDonation })).toEqual({
      name: "Buzz",
      amount: "125",
    });
    expect(findTopDonation).toHaveBeenCalledTimes(1);
  });

  test("returns undefined when there are no donors", async () => {
    expect(
      await getTopDonation({ findTopDonation: async () => undefined }),
    ).toBeUndefined();
  });

  test("aggregates goal amount from its configured start", async () => {
    const starting = new Date("2026-08-01T00:00:00Z");
    const sumSince = mock(async () => "250.50");
    expect(
      await getDonationGoal({
        getGoalStart: async () => starting,
        sumSince,
        getGoal: async () => 1000,
      }),
    ).toEqual({ amount: "250.50", goal: 1000 });
    expect(sumSince).toHaveBeenCalledWith(starting);
  });

  test("uses the Unix epoch when no goal start is configured", async () => {
    const sumSince = mock(async () => null);
    expect(
      await getDonationGoal({
        getGoalStart: async () => null,
        sumSince,
        getGoal: async () => null,
      }),
    ).toEqual({ amount: null, goal: null });
    expect(sumSince).toHaveBeenCalledWith(new Date(0));
  });
});
