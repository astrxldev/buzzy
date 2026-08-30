import { GoogleGenAI } from "@google/genai";
import { redis } from "@/lib/db/redis";
import { createTtsHandler } from "./handler";

export const GET = createTtsHandler({
  redis: redis!,
  widgetKey: process.env.DONATE_WIDGET_KEY,
  apiKeys: process.env.GEMINI_TTS_API_KEY,
  async generateContent({ apiKey, model, message, voice }) {
    const client = new GoogleGenAI({ apiKey });
    const response = await client.models.generateContent({
      model,
      contents: [{ parts: [{ text: message }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
        },
      },
    });
    return response.candidates?.[0].content?.parts?.[0].inlineData?.data;
  },
});
