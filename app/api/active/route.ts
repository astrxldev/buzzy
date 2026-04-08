import { sse } from "@/lib/db/sse-endpoints";

const version = Bun.file(".version");

export async function GET(req: Request) {
  if (process.env.ENVIRONMENT === "development")
    return sse.active.stream({
      motd: {
        data: "DEV",
        event: "version",
      },
      signal: req.signal,
    });
  if (!(await version.exists())) await version.write(crypto.randomUUID());
  let ver = await version.text();
  if (!ver) {
    ver = crypto.randomUUID();
    await version.write(crypto.randomUUID());
  }
  return sse.active.stream({
    motd: {
      data: ver,
      event: "version",
    },
    signal: req.signal,
  });
}
