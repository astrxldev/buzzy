import { PassThrough, Readable } from "node:stream";
import { hash as bunHash } from "bun";
import wav from "wav";
import z from "zod";

type TtsRedis = {
  get(key: string): Promise<string | null>;
  setex(key: string, ttl: number, value: string): Promise<unknown>;
};

type GenerateContent = (options: {
  apiKey: string;
  model: string;
  message: string;
  voice: string;
}) => Promise<string | undefined>;

type TtsDependencies = {
  redis: TtsRedis;
  widgetKey?: string;
  apiKeys?: string;
  generateContent: GenerateContent;
  hash?: (message: string) => string;
  random?: () => number;
  queue?: (callback: () => void) => void;
  toWav?: (audioData: string) => BodyInit;
  log?: (...values: unknown[]) => void;
  logError?: (...values: unknown[]) => void;
};

const MODELS = ["gemini-2.5-flash-preview-tts"] as const;
const MAX_TRIES = 10;
const voices = ["Zephyr", "Charon", "Fenrir", "Kore", "Sulafat"];
const messageSchema = z.string().max(1000);

export function createTtsHandler({
  redis,
  widgetKey,
  apiKeys = "",
  generateContent,
  hash = (message) => bunHash(message).toString(36),
  random = Math.random,
  queue = queueMicrotask,
  toWav = pcmToWav,
  log = console.log,
  logError = console.error,
}: TtsDependencies) {
  const choices = MODELS.flatMap((model) =>
    apiKeys
      .split(",")
      .map((key) => key.trim())
      .filter(Boolean)
      .map((apiKey) => ({ apiKey, model })),
  );

  return async function GET(request: Request) {
    if (!widgetKey || choices.length === 0)
      return Response.json({ error: "TTS is not configured" }, { status: 503 });

    const params = new URL(request.url).searchParams;
    const parsed = messageSchema.safeParse(params.get("message"));
    if (params.get("key") !== widgetKey || !parsed.success)
      return new Response(
        !parsed.success ? z.prettifyError(parsed.error) : "Invalid key",
        { status: 400 },
      );

    const message = parsed.data;
    const textHash = hash(message);
    const cached = await redis.get(`tts:${textHash}`);
    log(
      `[TTS] ${textHash}:${cached ? "cached" : "fresh"} "${message.slice(0, 200)}${message.length > 200 ? "..." : ""}"`,
    );
    if (cached)
      return new Response(toWav(cached), {
        headers: { "Content-Type": "audio/wav" },
      });

    let currentRotation = await redis
      .get("tts_key_rotation")
      .then((value) => (value ? Number(value) : 0))
      .catch(() => 0);
    if (!Number.isInteger(currentRotation) || currentRotation < 0)
      currentRotation = 0;
    currentRotation %= choices.length;

    let audioData: string | undefined;
    for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
      const choice = choices[currentRotation];
      log(
        `[TTS] Trying key ${choice.apiKey.slice(0, 8)}:${choice.model} (${currentRotation}/${choices.length} #${attempt + 1})...`,
      );
      try {
        audioData = await generateContent({
          ...choice,
          message,
          voice: voices[Math.floor(random() * voices.length)],
        });
        if (audioData) break;
      } catch (error) {
        logError(`TTS API key failed: ${choice.apiKey.slice(0, 8)}...`, error);
      }
      currentRotation = (currentRotation + 1) % choices.length;
    }
    log("[TTS] Got response?", audioData ? "yes" : "no");

    if (!audioData)
      return Response.json({ error: "Response is empty" }, { status: 500 });

    queue(() => {
      void redis.setex(`tts:${textHash}`, 604800, audioData);
      void redis.setex("tts_key_rotation", 604800, `${currentRotation}`);
    });
    return new Response(toWav(audioData), {
      headers: { "Content-Type": "audio/wav" },
    });
  };
}

export function pcmToWav(audioData: string) {
  const pcmStream = Readable.from([Buffer.from(audioData, "base64")]);
  const writer = new wav.Writer({
    channels: 1,
    sampleRate: 24000,
    bitDepth: 16,
  });
  const out = new PassThrough();

  pcmStream.pipe(writer);
  writer.on("data", (chunk) => out.write(chunk));
  writer.on("end", () => out.end());
  writer.on("error", () => out.end());
  return Readable.toWeb(out) as unknown as globalThis.ReadableStream;
}
