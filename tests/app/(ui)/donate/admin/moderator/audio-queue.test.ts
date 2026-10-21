import { describe, expect, test } from "bun:test";
import {
  createModeratorAudioQueue,
  type ModeratorAudio,
} from "@/app/(ui)/donate/admin/moderator/audio-queue";

class FakeAudio extends EventTarget {
  currentTime = 0;
  volume = 1;
  src = "";
  paused = false;
  reject = false;
  plays = 0;
  async play() {
    this.plays++;
    if (this.reject) throw new Error("play failed");
  }
  pause() {
    this.paused = true;
  }
  end() {
    this.dispatchEvent(new Event("ended"));
  }
  fail() {
    this.dispatchEvent(new Event("error"));
  }
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("moderator audio queue", () => {
  test("plays ring before custom audio and applies volume", async () => {
    const ring = new FakeAudio();
    const custom = new FakeAudio();
    const queue = createModeratorAudioQueue(
      () => ring,
      () => custom,
      () => 0.3,
    );
    const done = queue.enqueue("a".repeat(64));
    await tick();
    expect(ring.plays).toBe(1);
    expect(custom.plays).toBe(0);
    ring.end();
    await tick();
    expect(custom.plays).toBe(1);
    expect(custom.volume).toBe(0.3);
    custom.end();
    await done;
    expect(custom.src).toBe("");
    queue.dispose();
  });

  test("no attachment ends after ring", async () => {
    const ring = new FakeAudio();
    const queue = createModeratorAudioQueue(
      () => ring,
      () => {
        throw Error();
      },
      () => 1,
    );
    const done = queue.enqueue();
    await tick();
    ring.end();
    await done;
    queue.dispose();
  });

  test("play rejection and audio errors do not stall sequence", async () => {
    const ring = new FakeAudio();
    ring.reject = true;
    const custom = new FakeAudio();
    const queue = createModeratorAudioQueue(
      () => ring,
      () => custom,
      () => 1,
    );
    const done = queue.enqueue("b".repeat(64));
    await tick();
    expect(custom.plays).toBe(1);
    custom.fail();
    await done;
    queue.dispose();
  });

  test("timeout advances queue; dispose cancels waits and prevents later custom play", async () => {
    const ring = new FakeAudio();
    const custom = new FakeAudio();
    const queue = createModeratorAudioQueue(
      () => ring,
      () => custom,
      () => 1,
      10,
    );
    await queue.enqueue("c".repeat(64));
    expect(custom.plays).toBe(1);

    const nextRing = new FakeAudio();
    const nextCustom = new FakeAudio();
    const pending = createModeratorAudioQueue(
      () => nextRing,
      () => nextCustom,
      () => 1,
      10000,
    );
    const result = pending.enqueue("d".repeat(64));
    await tick();
    pending.dispose();
    await result;
    expect(nextRing.paused).toBe(true);
    expect(nextCustom.plays).toBe(0);
    queue.dispose();
  });

  test("volume changes update currently playing audio", async () => {
    const ring = new FakeAudio();
    const queue = createModeratorAudioQueue(
      () => ring,
      () => new FakeAudio() as ModeratorAudio,
      () => 0.4,
    );
    const done = queue.enqueue();
    await tick();
    queue.setVolume(0.8);
    expect(ring.volume).toBe(0.8);
    ring.end();
    await done;
    queue.dispose();
  });
});
