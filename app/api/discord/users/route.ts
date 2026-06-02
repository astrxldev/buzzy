import { getDiscordUsers } from "./api";

export async function GET() {
  return Response.json(await getDiscordUsers());
}
