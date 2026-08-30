type RouteContext<T> = { params: Promise<T> };

export function createCountHandler(count: () => Promise<number>) {
  return async function GET() {
    return Response.json(await count());
  };
}

export function createStatesHandler(
  getStates: (version: string) => Promise<unknown>,
) {
  return async function GET(
    _request: Request,
    { params }: RouteContext<{ ver: string }>,
  ) {
    const { ver } = await params;
    return Response.json(await getStates(ver));
  };
}

export function createSlipHandler(
  getSlip: (id: string) => Promise<Uint8Array<ArrayBuffer> | null>,
  notFound: () => never,
) {
  return async function GET(
    _request: Request,
    { params }: RouteContext<{ id: string }>,
  ) {
    const { id } = await params;
    const slip = await getSlip(id);
    if (!slip) notFound();

    return new Response(slip, {
      headers: { "Content-Type": "image/jpeg" },
    });
  };
}

export type CdnFile = {
  data: Uint8Array<ArrayBuffer>;
  type: string;
  size: string;
};

export function createCdnHandler(
  getFile: (id: string) => Promise<CdnFile | null>,
  notFound: () => never,
) {
  return async function GET(
    _request: Request,
    { params }: RouteContext<{ id: string }>,
  ) {
    const { id } = await params;
    const file = await getFile(id);
    if (!file) notFound();

    return new Response(file.data, {
      headers: {
        "Content-Type": file.type,
        "Content-Length": file.size,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  };
}

export function createAmberProxyHandler(
  path: "static/changelog" | "en/avatar",
  dependencies: {
    getVersionHash: () => Promise<string>;
    fetchText: (url: string) => Promise<string>;
  },
) {
  return async function GET() {
    const versionHash = await dependencies.getVersionHash();
    const body = await dependencies.fetchText(
      `https://gi.yatta.moe/api/v2/${path}?vh=${versionHash}`,
    );
    return new Response(body, {
      headers: { "Content-Type": "application/json" },
    });
  };
}

export function createAmberSyncHandler(dependencies: {
  adminCheck: () => Promise<unknown>;
  sync: () => Promise<void>;
  log: (message: string) => Promise<unknown>;
}) {
  return async function GET() {
    if (!(await dependencies.adminCheck())) {
      return new Response("Unauthorized", { status: 401 });
    }

    await dependencies.sync();
    await dependencies.log("Triggered an Amber sync from API");
    return new Response(
      "OK(log is wip, check `kubectl logs -fn buzz deployments/app`)",
    );
  };
}

type ProxyRequest = {
  url: string;
  nextUrl: { pathname: string; search: string };
};

export function createProxyHandler<
  TRequest extends ProxyRequest,
>(dependencies: {
  getSessionCookie: (request: TRequest) => unknown;
  redirect: (url: URL) => Response;
  next: () => Response;
}) {
  return async function proxy(request: TRequest) {
    if (!dependencies.getSessionCookie(request)) {
      const url = new URL("/login", request.url);
      url.searchParams.set(
        "next",
        request.nextUrl.pathname + request.nextUrl.search,
      );
      return dependencies.redirect(url);
    }

    return dependencies.next();
  };
}
