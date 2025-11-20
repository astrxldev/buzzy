"use client";

import { useEffect, useRef, useState } from "react";

export default function AutoFitText({ children, className }: { children: string, className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(10); // will update instantly

  // biome-ignore lint/correctness/useExhaustiveDependencies: it needs children
  useEffect(() => {
    function resize() {
      const container = containerRef.current;
      const text = textRef.current;
      if (!container || !text) return;

      // start large and shrink until it fits
      let size = 300;
      text.style.fontSize = `${size}px`;

      const { width: cw, height: ch } = container.getBoundingClientRect();

      while ((text.scrollWidth > cw || text.scrollHeight > ch) && size > 5) {
        size -= 2;
        text.style.fontSize = `${size}px`;
      }

      setFontSize(size - 5);
    }

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [children]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full grid place-content-center overflow-hidden"
    >
      <div
        ref={textRef}
        className={className}
        style={{
          fontSize,
          lineHeight: 1,
          whiteSpace: "nowrap",
          userSelect: "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
