type HeartbeatDependencies = {
  authorize: (credential: string | null) => void;
  resumeDonation: () => Promise<unknown | undefined>;
  publishHeartbeat: (tag: number) => unknown;
  queue: (task: () => void) => void;
};

export function createDonateHeartbeatHandler(
  dependencies: HeartbeatDependencies,
) {
  return async function PATCH(req: Request) {
    const params = new URL(req.url).searchParams;
    try {
      dependencies.authorize(params.get("key"));
    } catch {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tag = Number(params.get("tag") ?? "abc");
    const resume = params.get("resume") === "true";
    if (Number.isNaN(tag))
      return Response.json({ error: "Invalid Tag" }, { status: 400 });

    if (!resume)
      dependencies.queue(() => {
        void dependencies.resumeDonation();
      });

    dependencies.publishHeartbeat(tag);
    if (resume) {
      const donation = await dependencies.resumeDonation();
      if (donation) return Response.json(donation, { status: 302 });
    }
    return Response.json({ success: true });
  };
}
