import { getAmberVh } from "@/lib/api";
import { createAmberProxyHandler } from "@/lib/server-handlers";

export const GET = createAmberProxyHandler("en/avatar", {
  getVersionHash: getAmberVh,
  fetchText: (url) => fetch(url).then((response) => response.text()),
});
