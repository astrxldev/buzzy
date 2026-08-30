import { afterEach, describe, expect, test } from "bun:test";
import { rubgramWebhookTemplate } from "./webhook";

type Submission = Parameters<typeof rubgramWebhookTemplate>[1];
type ServiceType = Parameters<typeof rubgramWebhookTemplate>[2][number];

const originalBaseUrl = process.env.BASE_URL;

function submission(overrides: Partial<Submission> = {}): Submission {
  return {
    id: "submission-1",
    name: "Ada",
    user: "123456789",
    server: "as",
    service: ["raid", "unknown", "farm"],
    price: 250,
    ...overrides,
  } as Submission;
}

const types = [
  { id: "raid", display: "Raid", price: 100, order: 1 },
  { id: "farm", display: "Farm", price: 150, order: 2 },
] as ServiceType[];

afterEach(() => {
  if (originalBaseUrl === undefined) delete process.env.BASE_URL;
  else process.env.BASE_URL = originalBaseUrl;
});

describe("rubgramWebhookTemplate", () => {
  test.each([
    ["submit", "## :incoming_envelope: ลูกค้าลงคิว", 15714574, "**Not** paid"],
    ["paid", "## :money_with_wings: จ่ายเงินแล้ว", 0x0ef06d, "Paid"],
  ] as const)("builds the %s notification variant", (kind, heading, color, paid) => {
    process.env.BASE_URL = "https://buzz.test";
    const result = rubgramWebhookTemplate(kind, submission(), types);
    const container = result.components[0];
    const section = container.components[0];
    const details = container.components[2];

    expect(result.allowed_mentions).toEqual({ parse: [] });
    expect(result.flags).toBe(1 << 15);
    expect(container.accent_color).toBe(color);
    expect(section.components?.[0].content).toBe(heading);
    expect(section.accessory).toEqual({
      type: 2,
      style: 5,
      label: "Admin",
      url: "https://buzz.test/rubgram/admin/submission-1",
    });
    expect(details.content).toContain("**ชื่อ**: Ada");
    expect(details.content).toContain("- Raid\n- Farm");
    expect(details.content).not.toContain("unknown");
    expect(details.content).toContain("**เซิพ**: Asia");
    expect(details.content).toContain(`${paid}: **250 ฿** | <@123456789>`);
  });

  test.each([
    ["us", "America"],
    ["eu", "Europe"],
    ["as", "Asia"],
    ["tw", "Taiwan"],
  ] as const)("maps server %s to %s", (server, display) => {
    const result = rubgramWebhookTemplate(
      "submit",
      submission({ server }),
      types,
    );
    expect(result.components[0].components[2].content).toContain(
      `**เซิพ**: ${display}`,
    );
  });

  test("preserves requested service order and duplicates", () => {
    const result = rubgramWebhookTemplate(
      "paid",
      submission({ service: ["farm", "raid", "farm"] }),
      types,
    );
    expect(result.components[0].components[2].content).toContain(
      "- Farm\n- Raid\n- Farm",
    );
  });

  test("renders an empty service list when no IDs match", () => {
    const result = rubgramWebhookTemplate(
      "submit",
      submission({ service: ["missing"] }),
      types,
    );
    expect(result.components[0].components[2].content).toContain(
      "**บริการ**:\n\n**เซิพ**",
    );
  });

  test("reads the base URL for each generated payload", () => {
    process.env.BASE_URL = "https://first.test";
    const first = rubgramWebhookTemplate("submit", submission(), types);
    process.env.BASE_URL = "https://second.test";
    const second = rubgramWebhookTemplate("submit", submission(), types);

    expect(first.components[0].components[0].accessory?.url).toStartWith(
      "https://first.test/",
    );
    expect(second.components[0].components[0].accessory?.url).toStartWith(
      "https://second.test/",
    );
  });
});
