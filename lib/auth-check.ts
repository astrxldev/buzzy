export type AdminUser = {
  email: string;
  name: string;
  role?: string | null;
};

type AdminCheckDependencies<SessionUser extends AdminUser> = {
  noAuthCheck: string | undefined;
  bypassUser: AdminUser;
  internalUser: AdminUser;
  getInternalAuth: () => Promise<string | null>;
  getInternalToken: (token: string) => Promise<unknown>;
  getSession: () => Promise<{ user: SessionUser } | null>;
};

export async function checkAdmin<SessionUser extends AdminUser>({
  noAuthCheck,
  bypassUser,
  internalUser,
  getInternalAuth,
  getInternalToken,
  getSession,
}: AdminCheckDependencies<SessionUser>): Promise<
  SessionUser | AdminUser | null
> {
  if (noAuthCheck === "true") return bypassUser;

  const internalAuth = await getInternalAuth();
  if (internalAuth) {
    try {
      if (await getInternalToken(internalAuth)) return internalUser;
    } catch {
      // Redis is optional for session authentication.
    }
  }

  const session = await getSession();
  return session?.user.role === "admin" ? session.user : null;
}
