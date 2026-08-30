import { describe, expect, mock, test } from "bun:test";
import { createActiveHandler } from "./handler";

function dependencies() {
  return {
    file: {
      exists: mock(async () => true),
      text: mock(async () => "stored-version"),
      write: mock(async () => {}),
    },
    randomUUID: mock(() => "new-version"),
    isDevelopment: mock(() => false),
    stream: mock(
      async (_options: {
        motd: { data: string; event: string };
        signal: AbortSignal;
      }) => new Response("stream"),
    ),
  };
}

describe("active handler", () => {
  test("emits DEV without reading the version file in development", async () => {
    const deps = dependencies();
    deps.isDevelopment.mockReturnValue(true);
    const request = new Request("https://buzz.test/api/active");
    await createActiveHandler(deps)(request);
    expect(deps.file.exists).not.toHaveBeenCalled();
    expect(deps.stream).toHaveBeenCalledWith({
      motd: { data: "DEV", event: "version" },
      signal: request.signal,
    });
  });

  test("emits an existing persisted version", async () => {
    const deps = dependencies();
    await createActiveHandler(deps)(
      new Request("https://buzz.test/api/active"),
    );
    expect(deps.file.text).toHaveBeenCalled();
    expect(deps.file.write).not.toHaveBeenCalled();
    expect(deps.stream.mock.calls[0]?.[0].motd.data).toBe("stored-version");
  });

  test("persists and emits the same UUID when the file is absent", async () => {
    const deps = dependencies();
    deps.file.exists.mockResolvedValue(false);
    await createActiveHandler(deps)(
      new Request("https://buzz.test/api/active"),
    );
    expect(deps.randomUUID).toHaveBeenCalledTimes(1);
    expect(deps.file.write).toHaveBeenCalledWith("new-version");
    expect(deps.stream.mock.calls[0]?.[0].motd.data).toBe("new-version");
  });

  test("replaces an empty file with one UUID", async () => {
    const deps = dependencies();
    deps.file.text.mockResolvedValue("");
    await createActiveHandler(deps)(
      new Request("https://buzz.test/api/active"),
    );
    expect(deps.randomUUID).toHaveBeenCalledTimes(1);
    expect(deps.file.write).toHaveBeenCalledWith("new-version");
    expect(deps.stream.mock.calls[0]?.[0].motd.data).toBe("new-version");
  });
});
