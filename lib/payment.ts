import type { SlipokResponse } from "@/app/(ui)/rubgram/api";

const { SLIPOK_API_URL, SLIPOK_API_KEY } = process.env as Record<
  string,
  string
>;

export async function checkSlip(
  buffer: Buffer<ArrayBuffer>,
  type: string,
  amount: number,
): Promise<SlipokResponse> {
  const response = await fetch(SLIPOK_API_URL, {
    method: "POST",
    headers: {
      "x-authorization": SLIPOK_API_KEY,
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
