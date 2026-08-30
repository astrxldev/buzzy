type OAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  guildId: string;
  botToken: string;
};

type OAuthUser = { id: string; username: string; global_name?: string | null };

type CallbackDependencies = {
  config: OAuthConfig;
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  getState: () => string | undefined;
  clearState: () => void;
  setSession: (token: string) => void;
  saveUser: (user: {
    uid: string;
    display: string;
    username: string;
  }) => Promise<string>;
  redirect: (path: string) => Response;
  logError?: (message: string, error?: unknown) => void;
};

export function createRubgramCallbackHandler(
  dependencies: CallbackDependencies,
) {
  return async function GET(request: Request): Promise<Response> {
    const searchParams = new URL(request.url).searchParams;
    const oauthError = searchParams.has("error");
    const code = searchParams.get("code");
    if (!code && !oauthError)
      return Response.json({ error: "No code provided" }, { status: 400 });

    const expectedState = dependencies.getState();
    const state = searchParams.get("state");
    dependencies.clearState();
    if (!expectedState || !state || state !== expectedState)
      return Response.json({ error: "Invalid OAuth state" }, { status: 400 });
    if (oauthError) return dependencies.redirect("/rubgram");

    try {
      const tokenResponse = await dependencies.fetch(
        "https://discord.com/api/oauth2/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: dependencies.config.clientId,
            client_secret: dependencies.config.clientSecret,
            grant_type: "authorization_code",
            code: code!,
            redirect_uri: dependencies.config.redirectUri,
          }),
        },
      );
      if (!tokenResponse.ok)
        throw new Error(`Failed to exchange code: ${tokenResponse.status}`);

      const tokenData = (await tokenResponse.json()) as {
        access_token?: string;
      };
      if (!tokenData.access_token)
        throw new Error("Discord omitted access token");
      const accessToken = tokenData.access_token;

      const userResponse = await dependencies.fetch(
        "https://discord.com/api/users/@me",
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!userResponse.ok) throw new Error("Failed to fetch user data");
      const user = (await userResponse.json()) as OAuthUser;

      const memberResponse = await dependencies.fetch(
        `https://discord.com/api/users/@me/guilds/${dependencies.config.guildId}/member`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!memberResponse.ok) {
        const addResponse = await dependencies.fetch(
          `https://discord.com/api/guilds/${dependencies.config.guildId}/members/${user.id}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bot ${dependencies.config.botToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ access_token: accessToken }),
          },
        );
        if (!addResponse.ok)
          dependencies.logError?.("Failed to add user to guild");
      }

      const token = await dependencies.saveUser({
        uid: user.id,
        display: user.global_name || user.username,
        username: user.username,
      });
      dependencies.setSession(token);
      return dependencies.redirect("/rubgram");
    } catch (error) {
      dependencies.logError?.("Discord OAuth error", error);
      return Response.json({ error: "Authentication failed" }, { status: 500 });
    }
  };
}
