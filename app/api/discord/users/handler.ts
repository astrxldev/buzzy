export function createDiscordUsersHandler(
  getDiscordUsers: () => Promise<unknown>,
) {
  return async function GET() {
    return Response.json(await getDiscordUsers());
  };
}
