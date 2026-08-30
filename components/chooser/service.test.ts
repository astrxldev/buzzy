import { describe, expect, mock, test } from "bun:test";
import { listFilesService } from "./service";

describe("listFilesService", () => {
  test("requires admin before querying CDN files", async () => {
    const list = mock(async () => []);
    expect(
      listFilesService({ adminCheck: async () => false, list }),
    ).rejects.toBe("Unauthorized");
    expect(list).not.toHaveBeenCalled();
  });

  test("returns the chooser projection from its query", async () => {
    const files = [
      { id: "asset", name: "image.png", size: "4", type: "image/png" },
    ];
    expect(
      await listFilesService({
        adminCheck: async () => true,
        list: async () => files,
      }),
    ).toBe(files);
  });
});
