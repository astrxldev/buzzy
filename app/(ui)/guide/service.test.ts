import { describe, expect, mock, test } from "bun:test";
import { searchGuideService } from "./service";

describe("searchGuideService", () => {
  test("filters hidden guides without consulting auth for a public search", async () => {
    const adminCheck = mock(async () => true);
    const search = mock(async (_query: string, _includeHidden: boolean) => []);

    await searchGuideService("build", false, { adminCheck, search });

    expect(adminCheck).not.toHaveBeenCalled();
    expect(search).toHaveBeenCalledWith("build", false);
  });

  test("does not trust caller-provided admin access", async () => {
    const search = mock(async (_query: string, _includeHidden: boolean) => []);
    await searchGuideService("", true, {
      adminCheck: async () => null,
      search,
    });

    expect(search).toHaveBeenCalledWith("", false);
  });

  test("includes hidden guides only for a verified admin", async () => {
    const search = mock(async (_query: string, _includeHidden: boolean) => [
      "hidden",
    ]);
    expect(
      await searchGuideService("guide", true, {
        adminCheck: async () => ({ role: "admin" }),
        search,
      }),
    ).toEqual(["hidden"]);
    expect(search).toHaveBeenCalledWith("guide", true);
  });
});
