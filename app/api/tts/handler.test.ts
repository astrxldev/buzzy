import { describe, expect, mock, test } from "bun:test";
import { createTtsHandler, pcmToWav } from "./handler";

const request = (message = "hello", key = "widget") =>
  new Request(
    `https://example.com/api/tts?message=${encodeURIComponent(message)}&key=${encodeURIComponent(key)}`,
  );

function dependencies() {
  const redis = {
    get: mock((): Promise<string | null> => Promise.resolve(null)),
    setex: mock(() => Promise.resolve("OK")),
  };
  return {
    redis,
    widgetKey: "widget",
    apiKeys: "first, second",
    generateContent: mock(
      (_options: {
        apiKey: string;
        model: string;
        message: string;
        voice: string;
      }): Promise<string | undefined> => Promise.resolve("generated-pcm"),
    ),
    hash: () => "hash",
    random: () => 0,
    queue: (callback: () => void) => callback(),
    toWav: (audio: string) => `wav:${audio}`,
    log: mock(() => {}),
    logError: mock(() => {}),
  };
}

describe("TTS handler", () => {
  test.each([
    { widgetKey: undefined, apiKeys: "key" },
    { widgetKey: "widget", apiKeys: undefined },
    { widgetKey: "widget", apiKeys: " , " },
  ])("returns 503 when configuration is missing", async (config) => {
    const deps = { ...dependencies(), ...config };
    const response = await createTtsHandler(deps)(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "TTS is not configured" });
    expect(deps.redis.get).not.toHaveBeenCalled();
  });

  test("rejects an invalid widget key before accessing Redis", async () => {
    const deps = dependencies();
    const response = await createTtsHandler(deps)(request("hello", "wrong"));
    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid key");
    expect(deps.redis.get).not.toHaveBeenCalled();
  });

  test("rejects messages over 1000 characters", async () => {
    const deps = dependencies();
    const response = await createTtsHandler(deps)(request("x".repeat(1001)));
    expect(response.status).toBe(400);
    expect(deps.generateContent).not.toHaveBeenCalled();
  });

  test("returns cached audio without generating content", async () => {
    const deps = dependencies();
    deps.redis.get.mockResolvedValueOnce("cached-pcm");
    const response = await createTtsHandler(deps)(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("audio/wav");
    expect(await response.text()).toBe("wav:cached-pcm");
    expect(deps.redis.get).toHaveBeenCalledWith("tts:hash");
    expect(deps.generateContent).not.toHaveBeenCalled();
  });

  test("uses the persisted rotation, selected voice, and caches generated audio", async () => {
    const deps = dependencies();
    deps.redis.get.mockResolvedValueOnce(null).mockResolvedValueOnce("1");
    const response = await createTtsHandler(deps)(request("speak"));

    expect(await response.text()).toBe("wav:generated-pcm");
    expect(deps.generateContent).toHaveBeenCalledWith({
      apiKey: "second",
      model: "gemini-2.5-flash-preview-tts",
      message: "speak",
      voice: "Zephyr",
    });
    expect(deps.redis.setex).toHaveBeenCalledWith(
      "tts:hash",
      604800,
      "generated-pcm",
    );
    expect(deps.redis.setex).toHaveBeenCalledWith(
      "tts_key_rotation",
      604800,
      "1",
    );
  });

  test("rotates after an API rejection and logs the failure", async () => {
    const deps = dependencies();
    deps.generateContent
      .mockRejectedValueOnce(new Error("quota"))
      .mockResolvedValueOnce("audio");
    const response = await createTtsHandler(deps)(request());
    expect(response.status).toBe(200);
    expect(
      deps.generateContent.mock.calls.map((call) => call[0].apiKey),
    ).toEqual(["first", "second"]);
    expect(deps.logError).toHaveBeenCalledTimes(1);
  });

  test("continues rotating when an API response has no audio", async () => {
    const deps = dependencies();
    deps.generateContent
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce("audio");
    await createTtsHandler(deps)(request());
    expect(
      deps.generateContent.mock.calls.map((call) => call[0].apiKey),
    ).toEqual(["first", "second"]);
  });

  test("returns 500 after ten empty responses and does not cache", async () => {
    const deps = dependencies();
    deps.generateContent.mockResolvedValue(undefined);
    const response = await createTtsHandler(deps)(request());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Response is empty" });
    expect(deps.generateContent).toHaveBeenCalledTimes(10);
    expect(deps.redis.setex).not.toHaveBeenCalled();
  });

  test.each([
    "not-a-number",
    "-2",
    "99",
  ])("normalizes invalid or out-of-range rotation %p", async (rotation) => {
    const deps = dependencies();
    deps.redis.get.mockResolvedValueOnce(null).mockResolvedValueOnce(rotation);
    await createTtsHandler(deps)(request());
    const expected = rotation === "99" ? "second" : "first";
    expect(deps.generateContent.mock.calls[0]?.[0].apiKey).toBe(expected);
  });

  test("defaults rotation to zero when reading it rejects", async () => {
    const deps = dependencies();
    deps.redis.get
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error("redis unavailable"));
    await createTtsHandler(deps)(request());
    expect(deps.generateContent.mock.calls[0]?.[0].apiKey).toBe("first");
  });

  test("wraps PCM bytes in a mono 24kHz WAV stream", async () => {
    const pcm = new Uint8Array([1, 2, 3, 4]);
    const wav = new Uint8Array(
      await new Response(
        pcmToWav(Buffer.from(pcm).toString("base64")),
      ).arrayBuffer(),
    );

    expect(new TextDecoder().decode(wav.slice(0, 4))).toBe("RIFF");
    expect(new TextDecoder().decode(wav.slice(8, 12))).toBe("WAVE");
    expect(wav.slice(-pcm.length)).toEqual(pcm);
  });
});
