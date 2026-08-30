import { describe, expect, test } from "bun:test";
import {
  createAmberProxyHandler,
  createAmberSyncHandler,
  createCdnHandler,
  createCountHandler,
  createProxyHandler,
  createSlipHandler,
  createStatesHandler,
} from "./server-handlers";

const request = new Request("https://buzz.example/test");
const notFound = () => {
  throw new Error("not found");
};

describe("artifact count handler", () => {
  test("returns the submission count as JSON", async () => {
    const response = await createCountHandler(async () => 12)();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toBe(12);
  });
});

describe("rubgram count handler", () => {
  test("returns the non-deleted submission count as JSON", async () => {
    const response = await createCountHandler(async () => 7)();

    expect(await response.json()).toBe(7);
  });
});

describe("tier-list states handler", () => {
  test("passes the route version to the query and returns its states", async () => {
    let queriedVersion: string | undefined;
    const states = [{ id: "state-1" }, { id: "state-2" }];
    const handler = createStatesHandler(async (version) => {
      queriedVersion = version;
      return states;
    });

    const response = await handler(request, {
      params: Promise.resolve({ ver: "3.4" }),
    });

    expect(queriedVersion).toBe("3.4");
    expect(await response.json()).toEqual(states);
  });
});

describe("slip handler", () => {
  test("returns JPEG bytes for the requested slip", async () => {
    let queriedId: string | undefined;
    const handler = createSlipHandler(async (id) => {
      queriedId = id;
      return new Uint8Array([0xff, 0xd8, 0xff]);
    }, notFound);

    const response = await handler(request, {
      params: Promise.resolve({ id: "slip-1" }),
    });

    expect(queriedId).toBe("slip-1");
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([0xff, 0xd8, 0xff]),
    );
  });

  test("uses the not-found path when the slip is absent", async () => {
    const handler = createSlipHandler(async () => null, notFound);

    expect(
      handler(request, { params: Promise.resolve({ id: "missing" }) }),
    ).rejects.toThrow("not found");
  });
});

describe("CDN handler", () => {
  test("returns immutable content with stored metadata", async () => {
    let queriedId: string | undefined;
    const handler = createCdnHandler(async (id) => {
      queriedId = id;
      return {
        data: new Uint8Array([1, 2, 3, 4]),
        type: "image/png",
        size: "4",
      };
    }, notFound);

    const response = await handler(request, {
      params: Promise.resolve({ id: "asset-1" }),
    });

    expect(queriedId).toBe("asset-1");
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("content-length")).toBe("4");
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3, 4]),
    );
  });

  test("uses the not-found path when the asset is absent", async () => {
    const handler = createCdnHandler(async () => null, notFound);

    expect(
      handler(request, { params: Promise.resolve({ id: "missing" }) }),
    ).rejects.toThrow("not found");
  });
});

describe("Amber log handler", () => {
  test("fetches the changelog with the current version hash", async () => {
    let requestedUrl: string | undefined;
    const handler = createAmberProxyHandler("static/changelog", {
      getVersionHash: async () => "hash-log",
      fetchText: async (url) => {
        requestedUrl = url;
        return '{"changes":[]}';
      },
    });

    const response = await handler();

    expect(requestedUrl).toBe(
      "https://gi.yatta.moe/api/v2/static/changelog?vh=hash-log",
    );
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(await response.text()).toBe('{"changes":[]}');
  });
});

describe("Amber character handler", () => {
  test("fetches avatars with the current version hash", async () => {
    let requestedUrl: string | undefined;
    const handler = createAmberProxyHandler("en/avatar", {
      getVersionHash: async () => "hash-char",
      fetchText: async (url) => {
        requestedUrl = url;
        return '{"items":[]}';
      },
    });

    const response = await handler();

    expect(requestedUrl).toBe(
      "https://gi.yatta.moe/api/v2/en/avatar?vh=hash-char",
    );
    expect(await response.text()).toBe('{"items":[]}');
  });
});

describe("Amber sync handler", () => {
  test("rejects non-admin requests without syncing or logging", async () => {
    let synced = false;
    let logged = false;
    const handler = createAmberSyncHandler({
      adminCheck: async () => null,
      sync: async () => {
        synced = true;
      },
      log: async () => {
        logged = true;
      },
    });

    const response = await handler();

    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
    expect(synced).toBeFalse();
    expect(logged).toBeFalse();
  });

  test("syncs before recording the admin action", async () => {
    const calls: string[] = [];
    const handler = createAmberSyncHandler({
      adminCheck: async () => ({ role: "admin" }),
      sync: async () => {
        calls.push("sync");
      },
      log: async (message) => {
        calls.push(message);
      },
    });

    const response = await handler();

    expect(calls).toEqual(["sync", "Triggered an Amber sync from API"]);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("OK(");
  });
});

describe("application proxy", () => {
  const proxyRequest = {
    url: "https://buzz.example/admin/users?tab=banned",
    nextUrl: { pathname: "/admin/users", search: "?tab=banned" },
  };

  test("redirects anonymous requests to login with the full next path", async () => {
    let redirectUrl: URL | undefined;
    const handler = createProxyHandler({
      getSessionCookie: () => undefined,
      redirect: (url) => {
        redirectUrl = url;
        return new Response(null, { status: 307 });
      },
      next: () => new Response("next"),
    });

    const response = await handler(proxyRequest);

    expect(response.status).toBe(307);
    expect(redirectUrl?.pathname).toBe("/login");
    expect(redirectUrl?.searchParams.get("next")).toBe(
      "/admin/users?tab=banned",
    );
  });

  test("continues requests with a session cookie", async () => {
    let redirected = false;
    const handler = createProxyHandler({
      getSessionCookie: () => "session-cookie",
      redirect: () => {
        redirected = true;
        return new Response(null, { status: 307 });
      },
      next: () => new Response("next", { status: 200 }),
    });

    const response = await handler(proxyRequest);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("next");
    expect(redirected).toBeFalse();
  });
});
