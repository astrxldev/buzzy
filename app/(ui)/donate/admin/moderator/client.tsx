"use client";
import { ExternalLink, RadioTower } from "lucide-react";
import dynamic from "next/dynamic";
import { type ComponentProps, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { shared } from "@/lib/comms";
import { sse } from "@/lib/db/sse-endpoints";
import { createModeratorAudioQueue } from "./audio-queue";

const ReactPIP = dynamic(
  () => import("@/components/dpip").then((e) => e.DocumentPictureInPicture),
  {
    ssr: false,
  },
);

export function PIP(props: ComponentProps<typeof ReactPIP>) {
  return (
    <ReactPIP
      {...props}
      shareStyles
      buttonRenderer={({ toggle, isOpen }) => (
        <div className="flex flex-col">
          {isOpen ? <span>Content popped out.</span> : props.children}
          <Button onClick={toggle} variant="outline" size="icon-sm">
            <ExternalLink />
          </Button>
        </div>
      )}
      featureUnavailableRenderer={
        <div className="flex flex-col">
          {props.children}
          <Button disabled variant="outline" size="icon-sm">
            <ExternalLink />
          </Button>
        </div>
      }
    />
  );
}

export function ClientTracker() {
  const [connected, setConnected] = useState(0);
  const player = useRef<HTMLAudioElement>(null);
  const tracking = useRef(0);
  const audioQueue = useRef<ReturnType<
    typeof createModeratorAudioQueue
  > | null>(null);
  const volume = useRef(0.5);

  shared.signal("moderator.volume", (ev) => {
    volume.current = ev ?? 1;
    if (player.current) player.current.volume = volume.current;
    audioQueue.current?.setVolume(volume.current);
  });

  useEffect(() => {
    const currentQueue = createModeratorAudioQueue(
      () => player.current,
      (url) => new Audio(url),
      () => volume.current,
    );
    audioQueue.current = currentQueue;
    const { clean } = sse.donate.subMany({
      heartbeat: () => tracking.current++,
      ping: (donation) => void currentQueue.enqueue(donation.sound),
    });
    return () => {
      clean();
      currentQueue.dispose();
      if (audioQueue.current === currentQueue) audioQueue.current = null;
      player.current?.pause();
    };
  }, []);
  useEffect(() => {
    const interval = setInterval(() => {
      setConnected(tracking.current);
      tracking.current = 0;
    }, 10000);
    return () => clearInterval(interval);
  }, []);
  return (
    <Button variant="outline" disabled size="sm">
      <RadioTower /> {connected}
      {/* biome-ignore lint/a11y/useMediaCaption: This is a non-speech notification sound. */}
      <audio
        src="/assets/donate-mod-sfx.wav"
        preload="auto"
        ref={player}
        hidden
      />
    </Button>
  );
}

export function VolumeChanger() {
  const [volume, setVolume] = shared.state("moderator.volume");

  return (
    <div className="px-5 py-1">
      <Slider
        max={1}
        step={0.01}
        value={[volume ?? 0.5]}
        onValueChange={(v) => setVolume(v[0])}
      />
    </div>
  );
}
