"use client";
import { Button } from "@/components/ui/button";
import { sse } from "@/lib/db/sse-endpoints";
import { ExternalLink, RadioTower } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ComponentProps } from "react";

const ReactPIP = dynamic(() => import("react-document-picture-in-picture"), {
  ssr: false,
});

export function PIP(props: ComponentProps<typeof ReactPIP>) {
  return (
    <ReactPIP
      {...props}
      width={400}
      height={600}
      shareStyles
      buttonRenderer={({ toggle, isOpen }) => (
        <div>
          {isOpen ? <span>Content popped out.</span> : props.children}
          <Button onClick={toggle} variant="outline" size="icon-sm">
            <ExternalLink />
          </Button>
        </div>
      )}
      featureUnavailableRenderer={(r) => r}
    />
  );
}

export function ClientTracker() {
  const [connected, setConnected] = useState(0);
  const tracking = useRef(0);

  useEffect(
    () => sse.donate.sub("heartbeat", () => tracking.current++).clean,
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
      <RadioTower /> Connected: {connected}
    </Button>
  );
}
