import { describe, expect, mock, test } from "bun:test";
import { getSettingsService, updateSettingService } from "./service";

describe("settings services", () => {
  test("requires admin before reading settings", async () => {
    const read = mock(async () => ({ enka: false }));
    expect(
      getSettingsService(
        { enka: true },
        { adminCheck: async () => false, read },
      ),
    ).rejects.toBe("Unauthorized");
    expect(read).not.toHaveBeenCalled();
  });

  test("uses defaults only when no settings row exists", async () => {
    const defaults = { enka: true };
    expect(
      await getSettingsService(defaults, {
        adminCheck: async () => true,
        read: async () => undefined,
      }),
    ).toBe(defaults);
    expect(
      await getSettingsService(defaults, {
        adminCheck: async () => true,
        read: async () => ({ enka: false }),
      }),
    ).toEqual({ enka: false });
  });

  test("blocks unauthorized updates before persistence", async () => {
    const persist = mock(async (_value: boolean) => {});
    expect(
      updateSettingService(false, {
        adminCheck: async () => null,
        persist,
        afterPersist: async () => {},
      }),
    ).rejects.toBe("Unauthorized");
    expect(persist).not.toHaveBeenCalled();
  });

  test("persists the exact state before logging and revalidation", async () => {
    const calls: string[] = [];
    await updateSettingService(false, {
      adminCheck: async () => true,
      persist: async (value) => {
        calls.push(`persist:${value}`);
      },
      afterPersist: async (value) => {
        calls.push(`after:${value}`);
      },
    });
    expect(calls).toEqual(["persist:false", "after:false"]);
  });
});
