import type { SlipokResponse } from "@/app/(ui)/rubgram/api";

type CheckSlipDependencies = {
  fetch?: typeof fetch;
  apiUrl?: string;
  apiKey?: string;
};

export async function checkSlip(
  buffer: Buffer<ArrayBuffer>,
  type: string,
  amount: number,
  dependencies: CheckSlipDependencies = {},
): Promise<SlipokResponse> {
  const apiUrl = dependencies.apiUrl ?? process.env.SLIPOK_API_URL;
  if (!apiUrl) throw new Error("SLIPOK_API_URL is not configured");

  const response = await (dependencies.fetch ?? fetch)(apiUrl, {
    method: "POST",
    headers: {
      "x-authorization":
        dependencies.apiKey ?? process.env.SLIPOK_API_KEY ?? "",
    },
    body: (() => {
      const formData = new FormData();
      formData.append("files", new Blob([buffer], { type }), "image");
      formData.append("amount", amount.toString());
      // formData.append("log", "true"); // no log cause im logging myself
      return formData;
    })(),
  });

  const data = await response.json();

  // if (!response.ok) throw data;
  return data;
}
