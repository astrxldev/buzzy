<script lang="ts">
  import posthog from "posthog-js";
  import { onMount } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import { fade } from "svelte/transition";
  import WidgetVersion from "../WidgetVersion.svelte";
  import { markDone, markRunning } from "./widget.remote";

  type DonateData = {
    id: string;
    name: string;
    image?: string;
    amount: number;
    message: string;
  };

  let current = $state<DonateData>();
  let visible = $state(false);
  let sfx: HTMLAudioElement;
  const attachSfx: Attachment<HTMLAudioElement> = (element) => {
    sfx = element;
  };
  const onQueue: string[] = [];
  let queue = Promise.resolve();

  const wait = (time: number) => new Promise<void>((resolve) => setTimeout(resolve, time));

  function enqueue(data: DonateData) {
    if (!data || onQueue.includes(data.id)) return;
    onQueue.push(data.id);
    queue = queue.then(() => ping(data).catch(console.error));
  }

  async function ping(data: DonateData) {
    current = data;
    const { name, amount, message } = data;
    const key = new URLSearchParams(location.search).get("key") ?? "";
    void markRunning({ id: data.id, key });
    const tts = new Audio(`/api/tts?message=${encodeURIComponent(`"${name} โดเนทมา ${amount} บาท.. ${message}"`)}&key=${key}`);
    tts.load();
    const ttsAvailable = await new Promise<boolean>((resolve) => {
      tts.onloadeddata = () => resolve(true);
      tts.onerror = () => resolve(false);
      setTimeout(() => resolve(false), 120000);
    });
    if (!ttsAvailable) posthog.capture("donation_widget_tts_failed", { amount });

    visible = true;
    posthog.capture("donation_widget_displayed", {
      amount,
      name_length: name.length,
      has_image: !!data.image,
    });
    if (sfx) {
      void sfx.play();
      await new Promise<void>((resolve) => (sfx.onended = () => resolve()));
    }
    void tts.play();
    if (ttsAvailable) await new Promise<void>((resolve) => (tts.onended = () => resolve()));

    void markDone({ id: data.id, key });
    posthog.capture("donation_widget_animation_end", { amount, tts_available: ttsAvailable });
    await wait(3000);
    visible = false;
    await wait(1200);
    const index = onQueue.indexOf(data.id);
    if (index !== -1) onQueue.splice(index, 1);
  }

  onMount(() => {
    let failed = 0;
    const pendingHeartbeat: Record<number, () => void> = {};
    const source = new EventSource("/sse/donate");
    source.addEventListener("heartbeat", (event) => pendingHeartbeat[JSON.parse(event.data)]?.());
    source.addEventListener("ping", (event) => enqueue(JSON.parse(event.data) as DonateData));
    source.addEventListener("refresh", () => location.reload());
    posthog.capture("donation_widget_connected");

    const interval = window.setInterval(async () => {
      const tag = Math.floor(Math.random() * 1000);
      const heartbeat = new Promise<void>((resolve, reject) => {
        pendingHeartbeat[tag] = resolve;
        setTimeout(reject, 30000);
      });
      try {
        const response = await fetch(`/api/donate/hb?tag=${tag}${failed > 6 ? "&resume=true" : ""}`, {
          method: "PATCH",
          signal: AbortSignal.timeout(15000),
        }).catch(() => undefined);
        if (failed > 6 && response) {
          queueMicrotask(() => {
            if (response.status === 302) void response.json().then(enqueue);
          });
        }
        await heartbeat;
        failed = 0;
      } catch {
        failed++;
        posthog.capture("donation_widget_heartbeat_failure", { fail_count: failed });
        if (failed > 12) {
          void fetch("/widget/donate", {
            signal: AbortSignal.timeout(30000),
            method: "HEAD",
          })
            .then(({ ok }) => {
              if (!ok) throw new Error("NOT OK");
              location.reload();
            })
            .catch(() => console.warn("Wants to reload, but not safe. Retrying later."));
        }
      } finally {
        delete pendingHeartbeat[tag];
      }
    }, 10000);

    return () => {
      source.close();
      window.clearInterval(interval);
    };
  });
</script>

{#if visible && current}
  <div class="flex h-full items-center justify-center" out:fade={{ duration: 1000 }}>
    <div class="relative w-162.5 overflow-hidden">
      <div class="avatar-wrap absolute top-1/2 left-1/2 z-10 -translate-1/2">
        <div class="avatar-expander min-w-32">
          <img
            src={current.image ?? "/favicon.webp"}
            width="128"
            height="128"
            alt="User submission"
            class="aspect-square size-32 shrink-0 rounded-2xl bg-black/50 object-cover"
          />
        </div>
      </div>
      <div class="donate-panel mx-auto flex h-39 max-w-162.5 gap-3 overflow-hidden rounded-4xl bg-black/80">
        <div class="aspect-square size-32 shrink-0 rounded-2xl"></div>
        <div class="flex min-w-0 flex-col text-3xl font-semibold">
          <span class="donate-title whitespace-nowrap text-[#CB5959]">
            {current.name} : <span class="text-[#FFCC00]">โดเนทมา {current.amount}฿</span>
          </span>
          <span class="donate-message h-20 w-full wrap-break-word whitespace-break-spaces {current.message.length > 80 ? 'line-clamp-3 text-xl' : 'line-clamp-2 text-3xl'}">
            {current.message}
          </span>
        </div>
      </div>
    </div>
  </div>
{/if}
<audio src="/assets/donate-sfx.wav" {@attach attachSfx} preload="auto"></audio>
<WidgetVersion />

<style>
  .avatar-wrap {
    animation: avatar-in 1s cubic-bezier(0, 0.55, 0.45, 1) both;
  }
  .avatar-expander {
    animation: avatar-expand 1s 1s cubic-bezier(0, 0.55, 0.45, 1) both;
  }
  .donate-panel {
    animation: panel-expand 1s 1s cubic-bezier(0, 0.55, 0.45, 1) both;
  }
  .donate-title {
    animation: title-in 1s 1s cubic-bezier(0, 0.55, 0.45, 1) both;
  }
  .donate-message {
    animation: message-in 1s 1.5s ease both;
  }
  @keyframes avatar-in {
    from { top: 200%; rotate: 600deg; }
    to { top: 50%; rotate: 0deg; }
  }
  @keyframes avatar-expand {
    from { width: 1px; padding: 0; }
    to { width: 650px; padding: 20px; }
  }
  @keyframes panel-expand {
    from { width: 0; padding: 0; }
    to { width: 100%; padding: 20px; }
  }
  @keyframes title-in {
    from { padding-top: 20px; }
    to { padding-top: 0; }
  }
  @keyframes message-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
</style>
