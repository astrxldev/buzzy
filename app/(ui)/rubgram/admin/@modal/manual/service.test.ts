import { describe, expect, mock, test } from "bun:test";
import { type MobileUpload, retrieveMobileUploadService } from "./service";

describe("retrieveMobileUploadService", () => {
  test("requires admin before consuming an upload", async () => {
    const consume = mock(async (_key: string) => undefined);
    expect(
      retrieveMobileUploadService("key", {
        adminCheck: async () => false,
        consume,
      }),
    ).rejects.toBe("Unauthorized");
    expect(consume).not.toHaveBeenCalled();
  });

  test("returns the uploaded file once and rejects later retrieval", async () => {
    let upload: MobileUpload | undefined = {
      data: Uint8Array.from([1, 2, 3]),
      name: "slip.png",
      type: "image/png",
    };
    const dependencies = {
      adminCheck: async () => true,
      consume: async () => {
        const result = upload;
        upload = undefined;
        return result;
      },
    };

    const formData = await retrieveMobileUploadService("key", dependencies);
    const file = formData.get("file");
    expect(file).toBeInstanceOf(File);
    expect((file as File).name).toBe("slip.png");
    expect((file as File).type).toBe("image/png");
    expect(formData.get("name")).toBe("slip.png");
    expect(retrieveMobileUploadService("key", dependencies)).rejects.toThrow(
      "already retrieved",
    );
  });

  test.each([
    { data: null, name: "slip.png", type: "image/png" },
    { data: Uint8Array.from([1]), name: null, type: "image/png" },
    { data: Uint8Array.from([1]), name: "slip.png", type: null },
  ])("rejects incomplete upload metadata: %p", async (upload) => {
    expect(
      retrieveMobileUploadService("key", {
        adminCheck: async () => true,
        consume: async () => upload,
      }),
    ).rejects.toThrow("unavailable");
  });
});
