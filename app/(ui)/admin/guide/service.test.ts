import { describe, expect, mock, test } from "bun:test";
import { hideGuideService } from "./service";

describe("hideGuideService", () => {
  test("rejects anonymous callers before mutation", async () => {
    const toggle = mock(async (_id: string) => {});
    expect(
      hideGuideService("guide", {
        adminCheck: async () => false,
        toggle,
        afterToggle: async () => {},
      }),
    ).rejects.toBe("Unauthorized");
    expect(toggle).not.toHaveBeenCalled();
  });

  test("toggles before refreshing guide views", async () => {
    const calls: string[] = [];
    await hideGuideService("guide", {
      adminCheck: async () => true,
      toggle: async (id) => {
        calls.push(`toggle:${id}`);
      },
      afterToggle: async () => {
        calls.push("refresh");
      },
    });
    expect(calls).toEqual(["toggle:guide", "refresh"]);
  });
});
