/* eslint-disable @next/next/no-img-element */
/** biome-ignore-all lint/performance/noImgElement: og no @/components/image */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Image generation
export default async function generate({
  title,
  sub,
}: {
  title: string;
  sub: string;
}) {
  const kanit = await readFile(
    join(process.cwd(), "public/Kanit-SemiBold.ttf"),
  );
  const bannerData = await readFile(
    join(process.cwd(), "public/web_banner.png"),
    "base64",
  );
  const bannerSrc = `data:image/png;base64,${bannerData}`;
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "1222px",
        height: "560px",
        fontFamily: "Kanit",
        color: "#fff",
      }}
    >
      <img src={bannerSrc} alt="Banner" width={1222} height={560} />
      <div
        style={{
          fontSize: 64,
          position: "absolute",
          top: "160px",
          left: "60px",
          display: "flex",
          flexDirection: "column",
          right: "450px",
          bottom: "100px",
        }}
      >
        <div>{title}</div>
        <div
          style={{
            fontSize: 24,
            marginTop: "-20",
            color: "#aaa",
          }}
        >
          {sub}
        </div>
      </div>
    </div>,
    { fonts: [{ name: "Kanit", data: kanit }], width: 1222, height: 560 },
  );
}
