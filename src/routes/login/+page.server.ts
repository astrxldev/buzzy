import type { Cookies } from "@sveltejs/kit";
import { fail, isRedirect, redirect } from "@sveltejs/kit";
import { adminCheck, auth } from "@/lib/auth-core";
import type { Actions, PageServerLoad } from "./$types";

function splitSetCookieHeader(header: string) {
  return header.split(/,(?=\s*[^;,=\s]+=[^;,]*)/);
}

function safeNext(next: FormDataEntryValue | string | null) {
  const path = String(next || "/admin");
  return path.startsWith("/") && !path.startsWith("//") ? path : "/admin";
}

function applySetCookie(cookies: Cookies, header: string) {
  for (const cookie of splitSetCookieHeader(header)) {
    const [nameValue, ...attributeParts] = cookie
      .split(";")
      .map((part) => part.trim());
    const separator = nameValue.indexOf("=");
    if (separator === -1) continue;

    const name = nameValue.slice(0, separator);
    const value = nameValue.slice(separator + 1);
    const options: Parameters<typeof cookies.set>[2] = { path: "/" };

    for (const attribute of attributeParts) {
      const [rawKey, rawValue] = attribute.split("=");
      const key = rawKey.toLowerCase();
      const attrValue = rawValue?.trim();

      if (key === "path" && attrValue) options.path = attrValue;
      else if (key === "domain" && attrValue) options.domain = attrValue;
      else if (key === "max-age" && attrValue)
        options.maxAge = Number(attrValue);
      else if (key === "expires" && attrValue)
        options.expires = new Date(attrValue);
      else if (key === "samesite" && attrValue)
        options.sameSite = attrValue.toLowerCase() as "strict" | "lax" | "none";
      else if (key === "secure") options.secure = true;
      else if (key === "httponly") options.httpOnly = true;
    }

    cookies.set(name, decodeURIComponent(value), options);
  }
}

export const load: PageServerLoad = async ({ request, url }) => {
  const next = url.searchParams.get("next") || "/admin";
  if (await adminCheck(request.headers)) redirect(303, next);
  return { next };
};

export const actions: Actions = {
  default: async ({ cookies, request, url }) => {
    const data = await request.formData();
    const email = String(data.get("email") || "");
    const password = String(data.get("password") || "");
    const next = safeNext(data.get("next") || url.searchParams.get("next"));

    try {
      const result = await auth.api.signInEmail({
        body: { email, password },
        headers: request.headers,
        returnHeaders: true,
        returnStatus: true,
      });

      const setCookie = result.headers?.get("set-cookie");
      if (setCookie) {
        applySetCookie(cookies, setCookie);
      }

      redirect(303, next);
    } catch (error) {
      if (isRedirect(error)) throw error;

      return fail(400, {
        message: "Invalid email or password",
        email,
      });
    }
  },
};
