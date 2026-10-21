import { createHash } from "node:crypto";

export const DONATION_SOUND_TTL = 604800;
export const DONATION_SOUND_MAX_BYTES = 44 + 24000 * 2 * 30;
export const DONATION_SOUND_HASH = /^[a-f0-9]{64}$/;
const CACHE_PREFIX = "donation-sound:";

export type DonationSound = {
  hash: string;
  wav: Buffer;
};

type SoundCache = {
  setex(key: string, seconds: number, value: string): Promise<unknown>;
  get(key: string): Promise<string | null>;
};

/** Accept only the simple, bounded PCM16 WAV produced by the sound editor. */
export function parseDonationSound(wav: Buffer): DonationSound {
  if (wav.length <= 44 || wav.length > DONATION_SOUND_MAX_BYTES)
    throw new Error("เสียงต้องมีความยาวไม่เกิน 30 วินาที");
  if (
    wav.toString("latin1", 0, 4) !== "RIFF" ||
    wav.readUInt32LE(4) !== wav.length - 8 ||
    wav.toString("latin1", 8, 12) !== "WAVE" ||
    wav.toString("latin1", 12, 16) !== "fmt " ||
    wav.readUInt32LE(16) !== 16 ||
    wav.readUInt16LE(20) !== 1 ||
    wav.readUInt16LE(22) !== 1 ||
    wav.readUInt32LE(24) !== 24000 ||
    wav.readUInt32LE(28) !== 48000 ||
    wav.readUInt16LE(32) !== 2 ||
    wav.readUInt16LE(34) !== 16 ||
    wav.toString("latin1", 36, 40) !== "data" ||
    wav.readUInt32LE(40) !== wav.length - 44 ||
    (wav.length - 44) % 2 !== 0
  )
    throw new Error("รูปแบบเสียงไม่ถูกต้อง กรุณาเลือกและตัดเสียงใหม่");
  return { hash: createHash("sha256").update(wav).digest("hex"), wav };
}

export async function prepareDonationSound(
  file: File | undefined,
  amount: number,
): Promise<DonationSound | null> {
  if (!file) return null;
  if (amount < 10) throw new Error("เสียงโดเนทใช้ได้เมื่อโดเนทตั้งแต่ 10 บาทขึ้นไปเท่านั้น");
  if (file.size > DONATION_SOUND_MAX_BYTES)
    throw new Error("เสียงต้องมีความยาวไม่เกิน 30 วินาที");
  return parseDonationSound(Buffer.from(await file.arrayBuffer()));
}

async function withCacheDeadline<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Sound cache timed out")),
          2000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** A cache outage must not turn an accepted payment into a failed donation. */
export async function storeDonationSound(
  cache: SoundCache | null,
  sound: DonationSound | null,
): Promise<string | null> {
  if (!sound) return null;
  try {
    if (!cache) throw new Error("Sound cache is unavailable");
    await withCacheDeadline(
      cache.setex(
        `${CACHE_PREFIX}${sound.hash}`,
        DONATION_SOUND_TTL,
        sound.wav.toString("base64"),
      ),
    );
    return sound.hash;
  } catch (error) {
    console.error("Unable to cache donation sound; using default SFX", error);
    return null;
  }
}

export async function loadDonationSound(
  cache: SoundCache | null,
  hash: string,
) {
  if (!DONATION_SOUND_HASH.test(hash)) return null;
  if (!cache) throw new Error("Sound cache is unavailable");
  const encoded = await withCacheDeadline(cache.get(`${CACHE_PREFIX}${hash}`));
  if (!encoded) return null;
  const sound = parseDonationSound(Buffer.from(encoded, "base64"));
  if (sound.hash !== hash) throw new Error("Sound cache content hash mismatch");
  return sound.wav;
}
