import { adminCheck } from "@/lib/auth";
import { redis } from "@/lib/db/redis";
import { DONATION_SOUND_HASH, loadDonationSound } from "@/lib/donation-sound";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ hash: string }> },
) {
  const key = new URL(request.url).searchParams.get("key");
  const widgetAuthorized =
    !!process.env.DONATE_WIDGET_KEY && key === process.env.DONATE_WIDGET_KEY;
  if (!widgetAuthorized && !(await adminCheck()))
    return new Response("Unauthorized", { status: 401 });
  const { hash } = await params;
  if (!DONATION_SOUND_HASH.test(hash))
    return new Response("Invalid sound hash", { status: 400 });

  try {
    const wav = await loadDonationSound(redis, hash);
    if (!wav)
      return new Response("Sound expired or not found", { status: 404 });
    return new Response(new Uint8Array(wav), {
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": String(wav.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Unable to load donation sound", error);
    return new Response("Sound unavailable", { status: 503 });
  }
}
