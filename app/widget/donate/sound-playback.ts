/** Resolve on every outcome so a broken sound cannot hold the donation queue. */
export function playDonationSound(
  player: HTMLAudioElement,
  timeoutMs: number,
): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => finish(false), timeoutMs);
    const ended = () => finish(true);
    const failed = () => finish(false);
    function finish(played: boolean) {
      clearTimeout(timer);
      player.removeEventListener("ended", ended);
      player.removeEventListener("error", failed);
      player.pause();
      resolve(played);
    }
    player.addEventListener("ended", ended, { once: true });
    player.addEventListener("error", failed, { once: true });
    try {
      player.currentTime = 0;
      void player.play().catch(failed);
    } catch {
      failed();
    }
  });
}
