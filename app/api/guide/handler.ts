import z from "zod";

const GuideSchema = z.object({
  name: z.string().max(1000),
  link: z.httpUrl(),
  imageUrl: z.httpUrl(),
});

export type GuideInput = z.infer<typeof GuideSchema>;

type GuideDependencies = {
  adminCheck: () => Promise<unknown>;
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  saveGuide: (guide: GuideInput, image: Blob) => Promise<void>;
  actionLog: (message: string, details: unknown) => Promise<unknown>;
  revalidatePath: (path: string) => void;
};

export function createGuideHandler(dependencies: GuideDependencies) {
  return async function POST(req: Request) {
    if (!(await dependencies.adminCheck()))
      return new Response("Unauthorized", { status: 401 });

    const json = await req.json().catch(() => null);
    const result = GuideSchema.safeParse(json);
    if (!result.success)
      return new Response(z.prettifyError(result.error), { status: 422 });

    const imageResponse = await dependencies.fetch(result.data.imageUrl);
    if (!imageResponse.ok)
      return new Response("Failed to fetch guide image", { status: 502 });

    await dependencies.saveGuide(result.data, await imageResponse.blob());
    await dependencies.actionLog(`API Added guide ${result.data.name}`, {
      link: result.data.link,
      imageUrl: result.data.imageUrl,
    });
    dependencies.revalidatePath("/guide");
    dependencies.revalidatePath("/admin/guide");
    return new Response("OK");
  };
}
