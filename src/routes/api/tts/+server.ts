import { GoogleGenAI } from "@google/genai";
import { PassThrough, Readable } from "node:stream";
import wav from "wav";
import z from "zod";
import { redis } from "@/lib/db/redis";
import type { RequestHandler } from "./$types";

const { DONATE_WIDGET_KEY, GEMINI_TTS_API_KEY } = process.env;
const models = [
  "gemini-2.5-flash-preview-tts",
  "gemini-3.1-flash-preview-tts",
] as const;
const apiKeys = (GEMINI_TTS_API_KEY ?? "")
  .split(",")
  .map((key) => key.trim())
  .filter(Boolean);
const choices = models.flatMap((model) =>
  apiKeys.map(
    (key) => `${key}:${model}` as `${string}:${(typeof models)[number]}`,
  ),
);
const maxTries = 10;
const schema = z.object({
  message: z.string().max(1000),
  key: z.literal(DONATE_WIDGET_KEY),
});
const voices = ["Zephyr", "Charon", "Fenrir", "Kore", "Sulafat"];

export const GET: RequestHandler = async ({ url }) => {
  const result = schema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );
  if (!result.success) {
    return new Response(z.prettifyError(result.error), { status: 400 });
  }
  const { message } = result.data;
  const textHash = Bun.hash(message).toString(36);
  const cached = await redis!.get(`tts:${textHash}`);
  console.log(
    `[TTS] ${textHash}:${cached ? "cached" : "fresh"} "${message.slice(0, 200)}${message.length > 200 ? "..." : ""}"`,
  );
  if (cached) {
    return new Response(pcmToWav(cached), {
      headers: { "Content-Type": "audio/wav" },
    });
  }

  let audioData: string | undefined;
  let currentRotation = await redis!
    .get("tts_key_rotation")
    .then((value) => (value ? Number(value) : 0))
    .catch(() => 0);
  for (
    let i = 0;
    i < maxTries;
    i++, currentRotation = (currentRotation + 1) % choices.length
  ) {
    const [apiKey, model] = choices[currentRotation].split(":");
    console.log(
      `[TTS] Trying key ${apiKey.slice(0, 8)}:${model} (${currentRotation}/${choices.length} #${i + 1})...`,
    );
    const client = new GoogleGenAI({ apiKey });
    try {
      const response = await client.models.generateContent({
        model,
        contents: [{ parts: [{ text: message }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voices[Math.floor(Math.random() * voices.length)],
              },
            },
          },
        },
      });
      audioData = response.candidates?.[0].content?.parts?.[0].inlineData?.data;
      if (audioData) break;
    } catch (error) {
      console.error(`TTS API key failed: ${apiKey.slice(0, 8)}...`, error);
    }
  }
  console.log("[TTS] Got response?", audioData ? "yes" : "no");

  if (!audioData)
    return Response.json({ error: "Response is empty" }, { status: 500 });
  queueMicrotask(() => {
    redis!.setex(`tts:${textHash}`, 604800, audioData);
    redis!.setex("tts_key_rotation", 604800, `${currentRotation}`);
  });
  return new Response(pcmToWav(audioData), {
    headers: { "Content-Type": "audio/wav" },
  });
};

function pcmToWav(audioData: string) {
  const pcmStream = Readable.from([Buffer.from(audioData, "base64")]);
  const writer = new wav.Writer({
    channels: 1,
    sampleRate: 24000,
    bitDepth: 16,
  });
  const output = new PassThrough();
  pcmStream.pipe(writer);
  writer.on("data", (chunk) => output.write(chunk));
  writer.on("end", () => output.end());
  writer.on("error", () => output.end());
  return Readable.toWeb(output) as unknown as globalThis.ReadableStream;
}
