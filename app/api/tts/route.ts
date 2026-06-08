import { GoogleGenAI } from "@google/genai";
import wav from "wav";
import { Readable, PassThrough } from "stream";
import z from "zod";
import { env } from "process";
import { redis } from "@/lib/db/redis";
import { hash } from "bun";
const { DONATE_WIDGET_KEY } = process.env as Record<string, string>;

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
  if (cached)
    return new Response(pcmToWav(cached), {
      headers: { "Content-Type": "audio/wav" },
    });

  const client = new GoogleGenAI({ apiKey: env.GEMINI_TTS_API_KEY });

  const response = await client.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
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

  const audioData =
    response.candidates?.[0].content?.parts?.[0].inlineData?.data;
  if (!audioData)
    return Response.json({ error: "Response is empty" }, { status: 500 });
  queueMicrotask(() => {
    redis!.setex(`tts:${textHash}`, 604800, audioData);
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
