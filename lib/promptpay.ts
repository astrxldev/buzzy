import z from "zod";

// #region TLV
export type DataObject =
  | {
      type: "primitive";
      tag: number;
      value: string;
    }
  | {
      type: "template";
      tag: number;
      value: DataObject[];
    };

function serializeTLV(objects: DataObject[]): string {
  return objects
    .map((e, i) => {
      if (e.tag < 0 || e.tag > 99) throw new Error(`Tag ${i} must be 00-99`);

      const value = e.type === "primitive" ? e.value : serializeTLV(e.value);

      if (value.length > 99)
        throw new Error(`Value ${i} exceeds TLV length limit`);

      const tag = e.tag.toString().padStart(2, "0");
      const length = value.length.toString().padStart(2, "0");

      return `${tag}${length}${value}`;
    })
    .join("");
}

function parseTLV(payload: string): DataObject[] {
  const objects: DataObject[] = [];

  let i = 0;
  while (i < payload.length) {
    if (i + 4 > payload.length)
      throw new Error(
        `Malformed TLV payload: incomplete headers at index ${i}`,
      );

    const tagStr = payload.slice(i, i + 2);
    if (!/^\d{2}$/.test(tagStr))
      throw new Error(
        `Malformed TLV payload: invalid tag "${tagStr}" at index ${i}`,
      );
    const tag = parseInt(tagStr, 10);
    i += 2;

    const lengthStr = payload.slice(i, i + 2);
    if (!/^\d{2}$/.test(lengthStr))
      throw new Error(
        `Malformed TLV payload: invalid length "${lengthStr}" at index ${i}`,
      );
    const length = parseInt(lengthStr, 10);
    i += 2;

    if (i + length > payload.length)
      throw new Error(
        `Malformed TLV payload: expected value length ${length} at index ${i}, but reached end of string`,
      );

    const value = payload.slice(i, i + length);
    i += length;

    objects.push({ type: "primitive", tag, value });
  }
  return objects;
}

// #region Utility

function primitive<T = string>(
  data: DataObject[] | undefined,
  tag: number,
  transform?: (value: string) => T,
): T | string | undefined {
  const object = data?.find(
    (o): o is Extract<DataObject, { type: "primitive" }> =>
      o.tag === tag && o.type === "primitive",
  );

  if (!object) return undefined;

  return transform ? transform(object.value) : object.value;
}

function template<T = DataObject[]>(
  data: DataObject[] | undefined,
  tag: number,
  transform?: (value: DataObject[]) => T,
): T | DataObject[] | undefined {
  const object = data?.find(
    (o): o is Extract<DataObject, { type: "template" }> =>
      o.tag === tag && o.type === "template",
  );

  if (!object) return undefined;

  return transform ? transform(object.value) : object.value;
}

// #region EMVCo
function range(start: number, end: number) {
  return new Array(end - start).fill(start).map((s, i) => s + i);
}
const TEMPLATE_TAGS = new Set([...range(26, 52), 62, 64, ...range(80, 100)]);
function parseEMVCo(payload: string): DataObject[] {
  const tlv = parseTLV(payload);
  return tlv.map((o) =>
    TEMPLATE_TAGS.has(o.tag) && o.type === "primitive"
      ? ({
          type: "template",
          tag: o.tag,
          value: parseEMVCo(o.value),
        } satisfies DataObject)
      : o,
  );
}

const EMVCoPayload = z.object({
  payloadFormatIndicator: z.literal("01"),
  pointOfInitiationMethod: z.enum(["11", "12"]).optional(),

  paymentNetworkSpecific: z.array(
    z.object({
      tag: z.number(),
      value: z.custom<DataObject[]>(),
    }),
  ),

  merchantCategoryCode: z.string().length(4).optional(),

  transactionCurrency: z.string().length(3).optional(),

  transactionAmount: z.string().optional(),

  countryCode: z.string().length(2),

  // merchantName: z.string().optional(),
  // merchantCity: z.string().optional(),
});
function decodeEMVCo(objects: DataObject[]) {
  return EMVCoPayload.parse({
    payloadFormatIndicator: primitive(objects, 0),
    pointOfInitiationMethod: primitive(objects, 1),
    paymentNetworkSpecific: objects.filter((o) => o.tag >= 2 && o.tag <= 51),
    transactionCurrency: primitive(objects, 53),
    transactionAmount: primitive(objects, 54),
    countryCode: primitive(objects, 58),
  });
}

function encodeEMVCo(data: z.infer<typeof EMVCoPayload>): DataObject[] {
  const d = EMVCoPayload.parse(data);
  return (
    [
      [0, d.payloadFormatIndicator],
      [1, d.pointOfInitiationMethod],
      ...d.paymentNetworkSpecific.map((e) => [e.tag, e.value] as const),
      [52, d.merchantCategoryCode],
      [53, d.transactionCurrency],
      [54, d.transactionAmount],
      [58, d.countryCode],
    ] as const
  )
    .filter(([, value]) => value !== undefined)
    .map((t) =>
      typeof t[1] === "object"
        ? {
            type: "template",
            tag: t[0],
            value: t[1]!,
          }
        : {
            type: "primitive",
            tag: t[0],
            value: t[1]!,
          },
    );
}

// #region CRC
function crc16(data: Uint8Array): number {
  let crc = 0xffff; // Initial value
  const polynomial = 0x1021; // Polynomial: x^16 + x^12 + x^5 + 1

  for (let i = 0; i < data.length; i++) {
    crc ^= data[i] << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc;
}
function formatCRC(crc: number): string {
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
function verifyCRC(payload: string): boolean {
  if (payload.length < 8) return false;

  const crcTag = payload.slice(-8, -4);
  const expected = payload.slice(-4);

  if (crcTag !== "6304") return false;

  const calculated = crc16(new TextEncoder().encode(payload.slice(0, -4)))
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");

  return calculated === expected;
}

// #region PromptPay
const PromptPay = z.object({
  aid: z.literal("A000000677010111"),

  identifier: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("mobile"),
      value: z.string().length(13),
    }),
    z.object({
      type: z.literal("nationalId"),
      value: z.string().length(13),
    }),
    z.object({
      type: z.literal("ewallet"),
      value: z.string().length(15),
    }),
    z.object({
      type: z.literal("bankAccount"),
      value: z.string().max(43),
    }),
  ]),
});
function decodePromptPay(merchantAccount: DataObject[]) {
  const identifierTypes = {
    1: "mobile",
    2: "nationalId",
    3: "ewallet",
    4: "bankAccount",
  } as const;
  const object = merchantAccount.find(
    (o) => o.type === "primitive" && o.tag in identifierTypes,
  );
  if (!object || object.type !== "primitive")
    throw new Error("No valid PromptPay identifier found.");

  return PromptPay.parse({
    aid: primitive(merchantAccount, 0),
    identifier: {
      type: identifierTypes[object.tag as keyof typeof identifierTypes],
      value: object.value,
    },
  });
}

export {
  serializeTLV,
  parseTLV,
  EMVCoPayload,
  parseEMVCo,
  decodeEMVCo,
  encodeEMVCo,
  crc16,
  formatCRC,
  verifyCRC,
  decodePromptPay,
};
