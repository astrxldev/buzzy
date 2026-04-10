"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function StarsRenderer() {
  const cv = useRef<HTMLCanvasElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!cv.current) return;
    const canvas = cv.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const stars: {
      x: number;
      y: number;
      r: number;
      alpha: number;
      speed: number;
    }[] = [];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < Math.min(1000, canvas.width); i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5,
        alpha: Math.random(),
        speed: Math.random() * 0.04,
      });
    }

    let last = 0;
    function draw(t: number | null = null) {
      if (t !== null) {
        if (t - last < 33) return requestAnimationFrame(draw);
        last = t;
      }
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const s of stars) {
        s.alpha += s.speed;

        if (s.alpha > 1 || s.alpha < 0) {
          s.speed *= -1;
        }

        ctx.globalAlpha = s.alpha;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();
      }

      requestAnimationFrame(draw);
    }

    draw();
    setLoaded(true);
  }, []);

  return (
    <canvas
      ref={cv}
      className={cn(
        "z-[-1] object-cover fixed top-0 left-0 w-full h-fit min-h-dvh mask-[url('/mask.webp')] mask-cover mask-center mask-no-repeat transition-opacity duration-5000 opacity-0",
        loaded && "opacity-40",
      )}
    ></canvas>
  );
}
