import { describe, expect, mock, test } from "bun:test";
import { createDonateHeartbeatHandler } from "./handler";

function dependencies() {
  return {
    authorize: mock(() => {}),
    resumeDonation: mock(async (): Promise<unknown | undefined> => undefined),
    publishHeartbeat: mock(() => {}),
    queue: mock((task: () => void) => task()),
  };
}

describe("donation heartbeat handler", () => {
  test("authorizes before heartbeat side effects", async () => {
    const deps = dependencies();
    deps.authorize.mockImplementation(() => {
      throw new Error("Unauthorized");
    });
    const response = await createDonateHeartbeatHandler(deps)(
      new Request("https://buzz.test/api/donate/hb?tag=42&key=wrong"),
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(deps.authorize).toHaveBeenCalledWith("wrong");
    expect(deps.publishHeartbeat).not.toHaveBeenCalled();
    expect(deps.queue).not.toHaveBeenCalled();
  });

  test("rejects an invalid tag without side effects", async () => {
    const deps = dependencies();
    const response = await createDonateHeartbeatHandler(deps)(
      new Request("https://buzz.test/api/donate/hb?tag=nope"),
    );
    expect(response.status).toBe(400);
    expect(deps.publishHeartbeat).not.toHaveBeenCalled();
    expect(deps.queue).not.toHaveBeenCalled();
  });

  test("publishes and queues a resume check for a normal heartbeat", async () => {
    const deps = dependencies();
    const response = await createDonateHeartbeatHandler(deps)(
      new Request("https://buzz.test/api/donate/hb?tag=42"),
    );
    expect(await response.json()).toEqual({ success: true });
    expect(deps.publishHeartbeat).toHaveBeenCalledWith(42);
    expect(deps.queue).toHaveBeenCalledTimes(1);
    expect(deps.resumeDonation).toHaveBeenCalledTimes(1);
  });

  test("returns a resumed donation with the existing redirect status", async () => {
    const deps = dependencies();
    deps.resumeDonation.mockResolvedValue({ id: "donation-1", amount: 50 });
    const response = await createDonateHeartbeatHandler(deps)(
      new Request("https://buzz.test/api/donate/hb?tag=7&resume=true"),
    );
    expect(response.status).toBe(302);
    expect(await response.json()).toEqual({ id: "donation-1", amount: 50 });
    expect(deps.queue).not.toHaveBeenCalled();
  });

  test("returns success when an explicit resume finds nothing", async () => {
    const deps = dependencies();
    const response = await createDonateHeartbeatHandler(deps)(
      new Request("https://buzz.test/api/donate/hb?tag=1&resume=true"),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
  });
});
