import { GoogleGenAI } from "@google/genai";
import { hash } from "bun";
import { PassThrough, Readable } from "stream";
import wav from "wav";
import z from "zod";
import { redis } from "@/lib/db/redis";

const { DONATE_WIDGET_KEY, GEMINI_TTS_API_KEY } = process.env as Record<
  string,
  string
>;

const MODELS = [
  "gemini-2.5-flash-preview-tts",
  "gemini-3.1-flash-preview-tts",
] as const;
const API_KEYS = GEMINI_TTS_API_KEY.split(",")
  .map((k) => k.trim())
  .filter(Boolean);
const POSSIBLE_CHOICES = MODELS.flatMap((m) =>
  API_KEYS.map((k) => `${k}:${m}` as `${string}:${(typeof MODELS)[number]}`),
);
const MAX_TRIES = 10;

const Schema = z.object({
  message: z.string().max(1000),
  key: z.literal(DONATE_WIDGET_KEY),
});

const voices = ["Zephyr", "Charon", "Fenrir", "Kore", "Sulafat"];

export async function GET(request: Request) {
  const data = Schema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams.entries()),
  );
  if (data.error)
    return new Response(z.prettifyError(data.error), { status: 400 });
  const {
    data: { message },
  } = data;

  const textHash = hash(message).toString(36);
  const cached = await redis!.get(`tts:${textHash}`);
  console.log(
    `[TTS] ${textHash}:${cached ? "cached" : "fresh"} "${message.slice(0, 200)}${message.length > 200 ? "..." : ""}"`,
  );
  if (cached)
    return new Response(pcmToWav(cached), {
      headers: { "Content-Type": "audio/wav" },
    });

  let audioData: string | undefined;
  let currentRotation = await redis!
    .get("tts_key_rotation")
    .then((e) => (e ? Number(e) : 0))
    .catch(() => 0);
  for (
    let i = 0;
    i < MAX_TRIES;
    i++, currentRotation = (currentRotation + 1) % POSSIBLE_CHOICES.length
  ) {
    const [apiKey, model] = POSSIBLE_CHOICES[currentRotation].split(":");
    console.log(
      `[TTS] Trying key ${apiKey.slice(0, 8)}:${model} (${currentRotation}/${POSSIBLE_CHOICES} #${i + 1})...`,
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
    } catch (e) {
      console.error(`TTS API key failed: ${apiKey.slice(0, 8)}...`, e);
    }
  }
  console.log("[TTS] Got response?", audioData);

  if (!audioData)
    return Response.json({ error: "Response is empty" }, { status: 500 });
  queueMicrotask(() => {
    redis!.setex(`tts:${textHash}`, 604800, audioData);
    redis!.setex("tts_key_rotation", 604800, `${currentRotation}`);
  });
  return new Response(pcmToWav(audioData), {
    headers: { "Content-Type": "audio/wav" },
  });
}

function pcmToWav(audioData: string) {
  const audioBuffer = Buffer.from(audioData, "base64");
  const pcmStream = Readable.from([audioBuffer]);
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
