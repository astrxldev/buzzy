/** biome-ignore-all lint/a11y/noSvgWithoutTitle: no */
"use client";

export function TlStatusOverlay({
  ev,
  deprecates,
}: {
  ev: {
    upload: boolean;
    download: boolean;
    ev: "unknown" | "connecting" | "ready";
  };
  deprecates: string;
}) {
  return (
    <div
      className="absolute top-0 right-0 m-1 rounded bg-[#2225] backdrop-blur-sm border px-1 py-0.5 text-sm transition-colors z-30 pointer-events-none flex gap-1 items-center"
      style={{
        color:
          ev.upload || ev.download
            ? "#27B0F5"
            : { connecting: "#F5EB27", ready: "#27F557", unknown: "#A5A7A8" }[
                ev.ev
              ],
      }}
    >
      <span className="text-gray-300">ใช้ได้ถึง {deprecates}</span>
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="5" fill="currentColor" />
      </svg>
    </div>
  );
}
