import { eq } from "drizzle-orm";
import { after, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { cards, characters, submissions } from "@/lib/db/schema";
import { createCardHandler } from "./handler";

const handler = createCardHandler({
  findSubmission: async (id) =>
    db
      .select({ uid: submissions.uid, char: submissions.char })
      .from(submissions)
      .where(eq(submissions.id, id))
      .then(([value]) => value),
  findImage: async (id) =>
    db
      .select({ image: cards.image })
      .from(cards)
      .where(eq(cards.submission, id))
      .then(([value]) =>
        value?.image ? new Uint8Array(value.image) : undefined,
      ),
  findCharacter: async (name) =>
    db
      .select({ amber: characters.amber })
      .from(characters)
      .where(eq(characters.name, name))
      .then(([value]) => value),
  fetch,
  after,
  persistImage: async (subId, fresh) => {
    await db
      .insert(cards)
      .values({
        image: Buffer.from(fresh),
        submission: subId,
      })
      .onConflictDoUpdate({
        target: cards.submission,
        set: {
          image: Buffer.from(fresh),
        },
      });
  },
});

export function GET(
  req: NextRequest,
  context: RouteContext<"/api/card/[sub]">,
) {
  return handler(req, context);
}
