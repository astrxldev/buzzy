"use client";
import { AutoTextSize } from "auto-text-size";
import Image from "@/components/image";
import type { characters } from "@/lib/db/schema";

// TODO: Change amber type
export default function Avatar({
  char,
  scale = 1,
  selected,
  ...props
}: React.ComponentProps<"div"> & {
  char: typeof characters.$inferInsert;
  scale?: number;
  selected?: boolean | 0;
}) {
  const star = (key: number) => (
    <svg
      key={key}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 576 512"
      style={{
        fill: "rgba(255,204,50)",
        filter: "drop-shadow(#e3721b 0px 0px 1px)",
        height: 20,
        width: 20,
      }}
    >
      <title>Star</title>
      <path d="M381.2 150.3l143.7 21.2c11.9 1.7 21.9 10.1 25.7 21.6 3.8 11.6.7 24.2-7.9 32.8L438.5 328.1l24.6 146.6c2 12-2.9 24.2-12.9 31.3-9.9 7.1-23 8-33.7 2.3l-128.4-68.5-128.3 68.5c-10.8 5.7-23.9 4.8-33.8-2.3-9.9-7.1-14.9-19.3-12.8-31.3l24.6-146.6L33.58 225.9c-8.61-8.6-11.67-21.2-7.89-32.8 3.77-11.5 13.74-19.9 25.73-21.6L195 150.3l64.4-132.33C264.7 6.954 275.9-.04 288.1-.04c12.3 0 23.5 6.994 28.8 18.01l64.3 132.33z"></path>
    </svg>
  );
  const stars = [];
  for (let i = 0; i < (char.stars || 0); i++) stars.push(star(i));
  return (
    <div
      style={{
        width: 128 * scale,
        height: 168 * scale,
        opacity: typeof selected !== "boolean" || selected ? 1 : 0.4,
        // @ts-expect-error
        ":hover": { opacity: 0.8 },
      }}
      {...props}
      className="transition-opacity"
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "128px",
          background: "rgba(233, 229, 220)",
          borderRadius: ".5rem",
          position: "relative",
          overflow: "hidden",
          transform: `scale(${scale})`,
          transformOrigin: "0 0",
        }}
      >
        <Image
          src={`/cdn/${char.image}`}
          style={{
            background: `rgba(${
              char.stars === 5
                ? "200,124,36"
                : char.stars === 4
                  ? "148,112,187"
                  : "100,100,100"
            }) linear-gradient(136deg,rgba(49,43,71,.5294117647058824),transparent)`,
            borderBottomRightRadius: "1.5rem",
            filter: char.stars ? "" : "grayscale(100%) opacity(10%) blur(2px)",
          }}
          alt={char.name}
          height={128}
          width={128}
        />
        <div
          style={{
            padding: "8px",
            display: "flex",
            justifyContent: "center",
            alignContent: "center",
            fontWeight: "bold",
            color: "rgba(74,83,102)",
            height: 40,
          }}
        >
          <AutoTextSize mode="oneline" maxFontSizePx={16}>
            {char.name}
          </AutoTextSize>
        </div>
        <div
          style={{
            position: "absolute",
            width: "100%",
            top: "112px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          {stars}
        </div>
      </div>
    </div>
  );
}
