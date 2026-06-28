"use client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { shared } from "@/lib/comms";
import { sse } from "@/lib/db/sse-endpoints";
import { ExternalLink, RadioTower } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ComponentProps } from "react";

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

  shared.signal(
    "moderator.volume",
    (ev) => player.current && (player.current.volume = ev ?? 1),
  );

  useEffect(
    () =>
      player.current
        ? sse.donate.subMany({
            heartbeat: () => tracking.current++,
            ping: player.current.play.bind(player.current),
          }).clean
        : undefined,
    [],
  );
  useEffect(() => {
    const interval = setInterval(() => {
      setConnected(tracking.current);
      if (tracking.current > 0) tracking.current--;
    }, 10000);
    return () => clearInterval(interval);
  }, []);
  return (
    <Button variant="outline" disabled size="sm">
      <RadioTower /> {connected}
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
