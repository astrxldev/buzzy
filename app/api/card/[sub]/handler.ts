export type CardSubmission = { uid: string; char: string | null };
export type CardCharacter = { amber: string };

type CardDependencies = {
  findSubmission: (id: string) => Promise<CardSubmission | undefined>;
  findImage: (id: string) => Promise<Uint8Array<ArrayBuffer> | undefined>;
  findCharacter: (name: string) => Promise<CardCharacter | undefined>;
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  persistImage: (id: string, image: ArrayBuffer) => Promise<unknown>;
  after: (task: () => Promise<void>) => void;
};

export function createCardHandler(dependencies: CardDependencies) {
  return async function GET(
    _request: Request,
    { params }: { params: Promise<{ sub: string }> },
  ) {
    const { sub: subId } = await params;
    const [sub, image] = await Promise.all([
      dependencies.findSubmission(subId),
      dependencies.findImage(subId),
    ]);
    if (image) return new Response(image);
    if (!sub)
      return new Response(`Unknown submission: ${subId}`, { status: 404 });
    if (!sub.char)
      return new Response("This submission isn't character-specific.", {
        status: 422,
      });

    const character = await dependencies.findCharacter(sub.char);
    if (!character)
      return new Response(`Unknown character: ${sub.char}`, { status: 500 });

    const card = await dependencies.fetch(
      `https://api.astrxl.dev/v1/card/genshin/${encodeURIComponent(sub.uid)}/${encodeURIComponent(character.amber.split("-")[0])}?lang=th&substat=true&quality=true`,
    );
    if (!card.ok) return card;

    const fresh = await card.arrayBuffer();
    dependencies.after(async () => {
      await dependencies.persistImage(subId, fresh);
    });
    return new Response(fresh);
  };
}
