type AuthHandler = (request: Request) => Response | Promise<Response>;

export function createAuthHandlers<TAuth>(
  toHandler: (auth: TAuth) => { GET: AuthHandler; POST: AuthHandler },
  auth: TAuth,
) {
  return toHandler(auth);
}
