export type ModeratorAudio = Pick<
  HTMLAudioElement,
  | "currentTime"
  | "volume"
  | "play"
  | "pause"
  | "addEventListener"
  | "removeEventListener"
> & { src?: string };

export function createModeratorAudioQueue(
  ring: () => ModeratorAudio | null,
  makeCustom: (url: string) => ModeratorAudio,
  volume: () => number,
  timeoutMs = 35000,
) {
  let active = true;
  let chain = Promise.resolve();
  const playing = new Set<ModeratorAudio>();
  const cancelWaits = new Set<() => void>();
  const play = (audio: ModeratorAudio) =>
    new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        audio.removeEventListener("ended", finish);
        audio.removeEventListener("error", finish);
        playing.delete(audio);
        cancelWaits.delete(finish);
        audio.pause();
        resolve();
      };
      const timer = setTimeout(finish, timeoutMs);
      playing.add(audio);
      cancelWaits.add(finish);
      audio.addEventListener("ended", finish, { once: true });
      audio.addEventListener("error", finish, { once: true });
      try {
        void audio.play().catch(finish);
      } catch {
        finish();
      }
    });
  return {
    enqueue(sound?: string | null) {
      chain = chain.then(async () => {
        if (!active) return;
        const first = ring();
        if (!first) return;
        first.volume = volume();
        first.currentTime = 0;
        await play(first);
        if (!active || !sound) return;
        const next = makeCustom(`/api/donate/sound/${sound}`);
        next.volume = volume();
        await play(next);
        next.src = "";
      });
      return chain;
    },
    setVolume(value: number) {
      for (const audio of playing) audio.volume = value;
    },
    dispose() {
      active = false;
      for (const audio of playing) {
        audio.pause();
        if ("src" in audio) audio.src = "";
      }
      for (const cancel of cancelWaits) cancel();
      playing.clear();
    },
  };
}
