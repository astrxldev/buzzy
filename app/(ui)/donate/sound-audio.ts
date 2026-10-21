export const SOUND_SAMPLE_RATE = 24_000;
export const MAX_SOUND_SECONDS = 30;
export const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
export const MAX_SOURCE_SECONDS = 180;

export function isSoundEligible(amount: unknown) {
  return (
    (typeof amount === "string" || typeof amount === "number") &&
    Number.isFinite(Number(amount)) &&
    Number(amount) > 10
  );
}

export function constrainTrim(
  next: number[],
  duration: number,
): [number, number] {
  const start = Math.max(0, Math.min(next[0], duration));
  const end = Math.max(start, Math.min(next[1], duration));
  return [start, end];
}

export function isSoundTrimValid([start, end]: readonly [number, number]) {
  return (
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    start >= 0 &&
    end > start &&
    end - start <= MAX_SOUND_SECONDS
  );
}

// Export is a separate trust boundary: never rely on the visual trim control.
export function encodeSoundWav(
  channels: readonly Float32Array[],
  sampleRate: number,
  start: number,
  end: number,
  volume: number,
): ArrayBuffer {
  const frames = channels[0]?.length ?? 0;
  if (
    !frames ||
    channels.some((channel) => channel.length !== frames) ||
    !Number.isFinite(sampleRate) ||
    sampleRate <= 0 ||
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end <= start ||
    end > frames / sampleRate ||
    end - start > MAX_SOUND_SECONDS + 1e-9 ||
    !Number.isFinite(volume) ||
    volume < 0 ||
    volume > 1
  )
    throw new Error("เลือกช่วงเสียงที่ยาวไม่เกิน 30 วินาที");

  const count = Math.min(
    MAX_SOUND_SECONDS * SOUND_SAMPLE_RATE,
    Math.floor((end - start) * SOUND_SAMPLE_RATE),
  );
  if (!count) throw new Error("ช่วงเสียงที่เลือกสั้นเกินไป");
  const buffer = new ArrayBuffer(44 + count * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++)
      view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, buffer.byteLength - 8, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SOUND_SAMPLE_RATE, true);
  view.setUint32(28, SOUND_SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, count * 2, true);
  for (let i = 0; i < count; i++) {
    const position = start * sampleRate + (i * sampleRate) / SOUND_SAMPLE_RATE;
    const left = Math.min(frames - 1, Math.floor(position));
    const right = Math.min(frames - 1, left + 1);
    const fraction = position - left;
    let sample = 0;
    for (const channel of channels)
      sample += channel[left] + (channel[right] - channel[left]) * fraction;
    sample = Math.max(-1, Math.min(1, (sample / channels.length) * volume));
    view.setInt16(
      44 + i * 2,
      Math.round(sample * (sample < 0 ? 32768 : 32767)),
      true,
    );
  }
  return buffer;
}

export function waveformPeaks(buffer: AudioBuffer, bars = 100): number[] {
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) =>
    buffer.getChannelData(i),
  );
  return Array.from({ length: bars }, (_, bar) => {
    const start = Math.floor((bar * buffer.length) / bars);
    const end = Math.floor(((bar + 1) * buffer.length) / bars);
    let peak = 0;
    for (
      let i = start;
      i < end;
      i += Math.max(1, Math.floor((end - start) / 100))
    ) {
      for (const channel of channels)
        peak = Math.max(peak, Math.abs(channel[i]));
    }
    return peak;
  });
}

export async function decodeSound(
  file: File,
  signal: AbortSignal,
): Promise<AudioBuffer> {
  if (!file.size || file.size > MAX_SOURCE_BYTES)
    throw new Error("เลือกไฟล์เสียงขนาดไม่เกิน 10 MB");
  // Check metadata first to avoid decoding hours of highly compressed audio.
  const url = URL.createObjectURL(file);
  const audio = new Audio();
  try {
    await new Promise<void>((resolve, reject) => {
      const fail = () =>
        reject(new Error("อ่านไฟล์เสียงนี้ไม่ได้ ลองใช้ไฟล์ MP3, WAV หรือ Ogg"));
      const onAbort = () => {
        cleanup();
        fail();
      };
      const timer = window.setTimeout(onAbort, 15_000);
      const cleanup = () => {
        window.clearTimeout(timer);
        signal.removeEventListener("abort", onAbort);
        audio.onloadedmetadata = null;
        audio.onerror = null;
      };
      audio.onloadedmetadata = () => {
        cleanup();
        resolve();
      };
      audio.onerror = () => {
        cleanup();
        fail();
      };
      signal.addEventListener("abort", onAbort, { once: true });
      audio.preload = "metadata";
      audio.src = url;
      if (signal.aborted) {
        cleanup();
        fail();
      }
    });
    if (
      !Number.isFinite(audio.duration) ||
      audio.duration <= 0 ||
      audio.duration > MAX_SOURCE_SECONDS
    ) {
      throw new Error("เลือกไฟล์เสียงที่ยาวไม่เกิน 3 นาที");
    }
  } finally {
    audio.removeAttribute("src");
    audio.load();
    URL.revokeObjectURL(url);
  }
  signal.throwIfAborted();
  const context = new OfflineAudioContext(1, 1, SOUND_SAMPLE_RATE);
  const decoded = await context
    .decodeAudioData(await file.arrayBuffer())
    .catch(() => {
      throw new Error("อ่านไฟล์เสียงนี้ไม่ได้ ลองใช้ไฟล์ MP3, WAV หรือ Ogg");
    });
  signal.throwIfAborted();
  if (decoded.duration > MAX_SOURCE_SECONDS || decoded.numberOfChannels > 8)
    throw new Error("ไฟล์เสียงนี้ใหญ่เกินกว่าจะแก้ไขได้");
  return decoded;
}
