import { describe, expect, test } from "bun:test";
import { playDonationSound } from "@/app/widget/donate/sound-playback";

class FakeAudio extends EventTarget {
  currentTime = 7;
  paused = false;
  rejectPlay = false;
  play() {
    return this.rejectPlay
      ? Promise.reject(new Error("blocked"))
      : Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
  asAudio() {
    return this as unknown as HTMLAudioElement;
  }
}

describe("bounded donation SFX playback", () => {
  test("successful custom sound skips the fallback and resets playback position", async () => {
    const audio = new FakeAudio();
    const played = playDonationSound(audio.asAudio(), 100);
    audio.dispatchEvent(new Event("ended"));
    expect(await played).toBe(true);
    expect(audio.currentTime).toBe(0);
    expect(audio.paused).toBe(true);
  });

  test("expired or broken audio resolves false for built-in SFX fallback", async () => {
    const audio = new FakeAudio();
    const played = playDonationSound(audio.asAudio(), 100);
    audio.dispatchEvent(new Event("error"));
    expect(await played).toBe(false);
  });

  test("play rejection cannot block the queue", async () => {
    const audio = new FakeAudio();
    audio.rejectPlay = true;
    expect(await playDonationSound(audio.asAudio(), 100)).toBe(false);
  });

  test("stalled playback times out and pauses before fallback", async () => {
    const audio = new FakeAudio();
    expect(await playDonationSound(audio.asAudio(), 5)).toBe(false);
    expect(audio.paused).toBe(true);
  });
});
