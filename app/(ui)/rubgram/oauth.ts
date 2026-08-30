export function discordAuthorizationUrl(config: {
  clientId: string;
  redirectUri: string;
  state: string;
}) {
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    scope: "identify guilds.join guilds",
    state: config.state,
  });
  return `https://discord.com/oauth2/authorize?${params}`;
}
