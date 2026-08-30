import { describe, expect, mock, test } from "bun:test";
import {
  getDonationImage,
  publishTestPopup,
  reloadDonationWidget,
  resendDonationPopup,
  resetDonationGoal,
} from "./service";

function common(isAdmin = true) {
  return {
    isAdmin: mock(async () => isAdmin),
    capture: mock(() => {}),
    publish: mock(() => {}),
  };
}

describe("donation admin guards", () => {
  test("all admin operations reject before mutation, analytics, or SSE", async () => {
    const deps = common(false);
    const resetGoal = mock(async () => {});
    const resetSent = mock(async () => undefined);
    const findImage = mock(async () => Buffer.from("image"));
    const actions = [
      () => resetDonationGoal({ ...deps, resetGoal, now: () => new Date(0) }),
      () => publishTestPopup(deps),
      () => reloadDonationWidget(deps),
      () =>
        resendDonationPopup("id", {
          ...deps,
          resetSent,
          imageToDataUrl: async () => "data:image/jpeg;base64,aW1hZ2U=",
        }),
      () => getDonationImage("id", { isAdmin: deps.isAdmin, findImage }),
    ];
    for (const action of actions)
      await expect(action()).rejects.toThrow("Unauthorized");
    expect(resetGoal).not.toHaveBeenCalled();
    expect(resetSent).not.toHaveBeenCalled();
    expect(findImage).not.toHaveBeenCalled();
    expect(deps.capture).not.toHaveBeenCalled();
    expect(deps.publish).not.toHaveBeenCalled();
  });
});

describe("donation admin operations", () => {
  test("resets the goal at one timestamp and publishes an update", async () => {
    const deps = common();
    const at = new Date("2026-08-30T12:00:00Z");
    const resetGoal = mock(async () => {});
    await resetDonationGoal({ ...deps, resetGoal, now: () => at });
    expect(resetGoal).toHaveBeenCalledWith(at);
    expect(deps.capture).toHaveBeenCalledWith({
      distinctId: "admin",
      event: "donation_admin_goal_reset",
    });
    expect(deps.publish).toHaveBeenCalledWith("update", null);
  });

  test("publishes the stable test popup payload", async () => {
    const deps = common();
    await publishTestPopup(deps);
    expect(deps.publish).toHaveBeenCalledWith("ping", {
      id: "test",
      name: "Mr. Buzz",
      message: "นี่คือข้อความทดสอบโดเนท",
      amount: 67,
    });
  });

  test("publishes a widget refresh and analytics", async () => {
    const deps = common();
    await reloadDonationWidget(deps);
    expect(deps.capture).toHaveBeenCalledWith({
      distinctId: "admin",
      event: "donation_admin_widget_reload",
    });
    expect(deps.publish).toHaveBeenCalledWith("refresh", null);
  });

  test("resets and republishes a donation with normalized message and image", async () => {
    const deps = common();
    const resetSent = mock(async () => ({
      id: "donation-1",
      name: "Buzz",
      amount: 50,
      message: null,
      image: Buffer.from("image"),
    }));
    const imageToDataUrl = mock(async () => "data:image/jpeg;base64,aW1hZ2U=");
    await resendDonationPopup("donation-1", {
      ...deps,
      resetSent,
      imageToDataUrl,
    });
    expect(resetSent).toHaveBeenCalledWith("donation-1");
    expect(deps.publish).toHaveBeenCalledWith("ping", {
      id: "donation-1",
      name: "Buzz",
      amount: 50,
      message: "",
      image: "data:image/jpeg;base64,aW1hZ2U=",
    });
    expect(deps.capture).toHaveBeenCalledWith({
      distinctId: "admin",
      event: "donation_admin_resend",
      properties: { id: "donation-1" },
    });
  });

  test("fails resend when the donation does not exist", async () => {
    const deps = common();
    await expect(
      resendDonationPopup("missing", {
        ...deps,
        resetSent: async () => undefined,
        imageToDataUrl: async () => "unused",
      }),
    ).rejects.toThrow("not found");
    expect(deps.capture).not.toHaveBeenCalled();
    expect(deps.publish).not.toHaveBeenCalled();
  });

  test("returns an image and distinguishes missing rows from empty images", async () => {
    const isAdmin = async () => true;
    expect(
      await getDonationImage("id", {
        isAdmin,
        findImage: async () => Buffer.from("image"),
      }),
    ).toEqual(Buffer.from("image"));
    await expect(
      getDonationImage("id", { isAdmin, findImage: async () => undefined }),
    ).rejects.toThrow("not found");
    await expect(
      getDonationImage("id", { isAdmin, findImage: async () => null }),
    ).rejects.toThrow("no image");
  });
});
