import { describe, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import { encodeSoundWav } from "@/app/(ui)/donate/sound-audio";
import {
  DONATION_SOUND_MAX_BYTES,
  DONATION_SOUND_TTL,
  loadDonationSound,
  parseDonationSound,
  prepareDonationSound,
  storeDonationSound,
} from "@/lib/donation-sound";

function wav(samples = 24000) {
  const bytes = Buffer.alloc(44 + samples * 2);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(24000, 24);
  bytes.writeUInt32LE(48000, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(bytes.length - 44, 40);
  return bytes;
}

describe("donation sound validation", () => {
  test("hashes the exact WAV bytes with SHA256", () => {
    const bytes = wav();
    expect(parseDonationSound(bytes)).toEqual({
      hash: createHash("sha256").update(bytes).digest("hex"),
      wav: bytes,
    });
  });

  test("accepts the client editor's stereo-to-mono resampled export", () => {
    const source = new Float32Array(44100 * 30).fill(0.25);
    const bytes = Buffer.from(
      encodeSoundWav([source, source], 44100, 0, 30, 0.5),
    );
    expect(parseDonationSound(bytes).wav.length).toBe(DONATION_SOUND_MAX_BYTES);
  });

  test("allows exactly thirty seconds and rejects longer or empty audio", () => {
    expect(DONATION_SOUND_MAX_BYTES).toBe(1_440_044);
    expect(wav(720000).length).toBe(DONATION_SOUND_MAX_BYTES);
    expect(() => parseDonationSound(wav(720000))).not.toThrow();
    expect(() => parseDonationSound(wav(720001))).toThrow();
    expect(() => parseDonationSound(wav(0))).toThrow();
    expect(() => parseDonationSound(Buffer.from("RIFF"))).toThrow();
  });

  test("rejects malformed headers, unsupported codecs and inconsistent lengths", () => {
    for (const offset of [0, 4, 8, 12, 16, 20, 22, 24, 28, 32, 34, 36, 40]) {
      const bytes = wav();
      bytes[offset] ^= 0x80;
      expect(() => parseDonationSound(bytes)).toThrow();
    }
    const odd = Buffer.concat([wav(), Buffer.from([0])]);
    odd.writeUInt32LE(odd.length - 8, 4);
    odd.writeUInt32LE(odd.length - 44, 40);
    expect(() => parseDonationSound(odd)).toThrow();
  });

  test("eligibility starts at ten; no attachment is unchanged", async () => {
    const file = new File([wav()], "sound.wav", { type: "audio/wav" });
    for (const amount of [1, 9.99])
      await expect(prepareDonationSound(file, amount)).rejects.toThrow();
    expect(await prepareDonationSound(file, 10)).not.toBeNull();
    expect(await prepareDonationSound(file, 10.01)).not.toBeNull();
    expect(await prepareDonationSound(undefined, 10)).toBeNull();
  });

  test("checks bytes rather than trusting the MIME type", async () => {
    const valid = new File([wav()], "sound.bin", { type: "text/plain" });
    expect(await prepareDonationSound(valid, 11)).not.toBeNull();
    const forged = new File(["not a WAV"], "sound.wav", { type: "audio/wav" });
    expect(prepareDonationSound(forged, 11)).rejects.toThrow();
  });
});

describe("donation sound cache (in-memory only)", () => {
  test("stores under its own hash namespace for seven days and reads exact bytes", async () => {
    const sound = parseDonationSound(wav());
    const values = new Map<string, string>();
    const calls: unknown[][] = [];
    const cache = {
      async setex(key: string, seconds: number, value: string) {
        calls.push([key, seconds]);
        values.set(key, value);
      },
      async get(key: string) {
        return values.get(key) ?? null;
      },
    };
    expect(await storeDonationSound(cache, sound)).toBe(sound.hash);
    expect(calls).toEqual([
      [`donation-sound:${sound.hash}`, DONATION_SOUND_TTL],
    ]);
    expect(await loadDonationSound(cache, sound.hash)).toEqual(sound.wav);
    expect(await loadDonationSound(cache, "../invalid")).toBeNull();
    values.clear();
    expect(await loadDonationSound(cache, sound.hash)).toBeNull();
  });

  test("does not touch the cache without an attachment", async () => {
    expect(await storeDonationSound(null, null)).toBeNull();
  });

  test("cache failure cannot reject an accepted donation", async () => {
    const log = spyOn(console, "error").mockImplementation(() => {});
    try {
      const cache = {
        async setex() {
          throw new Error("offline");
        },
        async get() {
          return null;
        },
      };
      const sound = parseDonationSound(wav());
      expect(await storeDonationSound(cache, sound)).toBeNull();
      expect(await storeDonationSound(null, sound)).toBeNull();
    } finally {
      log.mockRestore();
    }
  });

  test("rejects corrupted cache content", async () => {
    const sound = parseDonationSound(wav());
    const other = wav();
    other[44] = 1;
    const cache = {
      async setex() {},
      async get() {
        return other.toString("base64");
      },
    };
    expect(loadDonationSound(cache, sound.hash)).rejects.toThrow(
      "hash mismatch",
    );
  });

  test("stalled Redis storage is bounded and falls back to default SFX", async () => {
    const log = spyOn(console, "error").mockImplementation(() => {});
    try {
      const cache = {
        setex() {
          return new Promise<never>(() => {});
        },
        async get() {
          return null;
        },
      };
      expect(
        await storeDonationSound(cache, parseDonationSound(wav())),
      ).toBeNull();
    } finally {
      log.mockRestore();
    }
  });
});
