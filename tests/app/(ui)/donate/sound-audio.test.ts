import { describe, expect, test } from "bun:test";
import {
  constrainTrim,
  encodeSoundWav,
  isSoundEligible,
  isSoundTrimValid,
} from "@/app/(ui)/donate/sound-audio";

describe("donation sound eligibility", () => {
  test("requires a finite amount strictly greater than ten", () => {
    for (const value of [
      undefined,
      null,
      "",
      0,
      10,
      "10",
      "no",
      Infinity,
      true,
      [],
      {},
    ])
      expect(isSoundEligible(value)).toBe(false);
    for (const value of [10.01, "10.01", 100])
      expect(isSoundEligible(value)).toBe(true);
  });
});

describe("trim selection", () => {
  test("moves either boundary independently without a five-second clamp", () => {
    expect(constrainTrim([0, 10], 30)).toEqual([0, 10]);
    expect(constrainTrim([0, 15], 30)).toEqual([0, 15]);
    expect(constrainTrim([2, 15], 30)).toEqual([2, 15]);
    expect(constrainTrim([2, 29], 30)).toEqual([2, 29]);
  });

  test("keeps the range within the audio and start at or before end", () => {
    expect(constrainTrim([-5, 50], 3)).toEqual([0, 3]);
    expect(constrainTrim([8, 2], 30)).toEqual([8, 8]);
  });

  test("save eligibility accepts exactly thirty seconds but rejects longer ranges", () => {
    expect(isSoundTrimValid([0, 30])).toBe(true);
    expect(isSoundTrimValid([10, 40])).toBe(true);
    expect(isSoundTrimValid([0, 29.99])).toBe(true);
    for (const range of [
      [0, 30.01],
      [10, 40.01],
      [0, 0],
      [3, 2],
      [-1, 2],
      [0, Infinity],
      [NaN, 2],
    ] as const) {
      expect(isSoundTrimValid(range)).toBe(false);
    }
  });
});

describe("canonical PCM WAV export", () => {
  test("writes a 30 second PCM16 mono 24kHz WAV within the backend byte limit", () => {
    const wav = encodeSoundWav(
      [new Float32Array(48_000 * 31)],
      48_000,
      1,
      31,
      1,
    );
    const view = new DataView(wav);
    expect(new TextDecoder().decode(wav.slice(0, 4))).toBe("RIFF");
    expect(new TextDecoder().decode(wav.slice(8, 16))).toBe("WAVEfmt ");
    expect(view.getUint32(4, true)).toBe(wav.byteLength - 8);
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(24_000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(1_440_000);
    expect(wav.byteLength).toBe(1_440_044);
  });

  test("downmixes channels, bakes in volume, clips and writes signed little-endian PCM", () => {
    const wav = encodeSoundWav(
      [new Float32Array([1, -1, 5]), new Float32Array([0, -1, 5])],
      24_000,
      0,
      3 / 24_000,
      0.5,
    );
    const view = new DataView(wav);
    expect(view.getInt16(44, true)).toBe(8192);
    expect(view.getInt16(46, true)).toBe(-16384);
    expect(view.getInt16(48, true)).toBe(32767);
  });

  test("rejects invalid or overlong ranges independently of UI", () => {
    const channels = [new Float32Array(240_000)];
    for (const [start, end, volume] of [
      [0, 30.01, 1],
      [-1, 2, 1],
      [2, 2, 1],
      [0, 11, 1],
      [0, 1, 2],
      [NaN, 2, 1],
    ]) {
      expect(() =>
        encodeSoundWav(channels, 24_000, start, end, volume),
      ).toThrow();
    }
    expect(() => encodeSoundWav([], 24_000, 0, 1, 1)).toThrow();
  });

  test("resamples the requested portion rather than uploading the source", () => {
    const wav = encodeSoundWav(
      [new Float32Array([0, 0.5, 1, 0.5])],
      12_000,
      1 / 12_000,
      3 / 12_000,
      1,
    );
    const view = new DataView(wav);
    expect(wav.byteLength).toBe(52);
    expect(view.getInt16(44, true)).toBe(16384);
    expect(view.getInt16(46, true)).toBe(24575);
    expect(view.getInt16(48, true)).toBe(32767);
  });
});
