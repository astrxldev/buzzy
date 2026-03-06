import type { endgameSubmissions, endgameTypes } from "@/lib/db/schema";

export function rubgramWebhookTemplate(
  type: "submit" | "paid",
  sub: typeof endgameSubmissions.$inferSelect,
  types: (typeof endgameTypes.$inferSelect)[],
) {
  return {
    allowed_mentions: { parse: [] },
    flags: 1 << 15,
    components: [
      {
        type: 17,
        components: [
          {
            type: 9,
            components: [
              {
                type: 10,
                content:
                  type === "submit"
                    ? "## :incoming_envelope: ลูกค้าลงคิว"
                    : "## :money_with_wings: จ่ายเงินแล้ว",
              },
            ],
            accessory: {
              type: 2,
              style: 5,
              label: "Admin",
              url: `${process.env.BASE_URL}/rubgram/admin/${sub.id}`,
            },
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: `**ชื่อ**: ${sub.name}\n**บริการ**:\n${sub.service
              .map((s) => types.find((t) => t.id === s)?.display)
              .filter(Boolean)
              .map((s) => `- ${s}`)
              .join(
                "\n",
              )}\n**เซิพ**: ${{ us: "America", eu: "Europe", as: "Asia", tw: "Taiwan" }[sub.server]}\n-# ${type === "submit" ? "**Not** p" : "P"}aid: **${sub.price} ฿** | <@${sub.user}>`,
          },
        ],
        accent_color: type === "paid" ? 0x0ef06d : 15714574,
      },
    ],
  };
}
