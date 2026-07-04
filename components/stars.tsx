"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function StarsRenderer({ mask }: { mask: string }) {
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
    const shootingStars: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
    }[] = [];

    function spawnShootingStar() {
      const angle = Math.PI / 4 + Math.random() * 0.3;
      const speed = 6 + Math.random() * 4;

      shootingStars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 30,
      });
    }

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < Math.min(1000, canvas.width) / 2; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5,
        alpha: Math.random(),
        speed: Math.random() * 0.03,
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

        ctx.globalAlpha = Math.min(s.alpha, 1);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();
      }

      if (Math.random() < 0.002) {
        spawnShootingStar();
      }

      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];

        s.x += s.vx;
        s.y += s.vy;
        s.life++;

        const t = s.life / s.maxLife;

        const alpha = 1 - t;

        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 5, s.y - s.vy * 5);
        ctx.stroke();

        if (s.life > s.maxLife) {
          shootingStars.splice(i, 1);
        }
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
        "fixed top-0 left-0 z-[-1] h-fit min-h-dvh w-full mask-cover mask-center mask-no-repeat object-cover opacity-0 transition-opacity duration-5000",
        loaded && "opacity-40",
      )}
      style={{
        maskImage: `url(${JSON.stringify(mask)})`,
      }}
    ></canvas>
  );
}
