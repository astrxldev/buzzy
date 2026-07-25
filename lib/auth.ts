import {
  adminCheck as checkAdminHeaders,
  auth,
  issueInternalToken,
} from "./auth-core";

export { auth, issueInternalToken };

export async function adminCheck(inputHeaders?: Headers) {
  "use server";

  const head =
    inputHeaders ??
    (await import("next/headers").then(async ({ headers }) => headers()));
  if (!head) return null;
  return checkAdminHeaders(head);
}
