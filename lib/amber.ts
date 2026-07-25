import { z } from "zod";
import { redis } from "./db/redis";

export async function getAmberVh() {
  try {
    const cached = await redis?.get("amber:vh");
    if (cached) return cached;
  } catch {}

  const schema = z.object({
    response: z.number().positive(),
    data: z.object({
      vh: z.string().max(10),
    }),
  });
  const {
    data: { vh },
  } = schema.parse(
    await fetch("https://gi.yatta.moe/api/v2/static/version").then((response) =>
      response.json(),
    ),
  );
  queueMicrotask(() => redis?.setex("amber:vh", 86400, vh));
  return vh;
}
