import { ps } from "@/lib/db/redis";

const version = Bun.file(".version");

export async function GET(req: Request) {
  if (process.env.ENVIRONMENT === "development")
    return ps.new("active", {
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
  return ps.new("active", {
    motd: {
      data: ver,
      event: "version",
    },
    signal: req.signal,
  });
}
