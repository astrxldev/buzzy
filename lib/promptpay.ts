import { z } from "zod";

// #region Public types
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

export type PaymentNetworkSpecific = {
  tag: number;
  value: DataObject[];
};

export type EMVCoData = {
  payloadFormatIndicator: "01";
  pointOfInitiationMethod?: "11" | "12";
  paymentNetworkSpecific: PaymentNetworkSpecific[];
  merchantCategoryCode?: string;
  transactionCurrency?: string;
  transactionAmount?: string;
  countryCode: string;
  additionalData?: DataObject[];
};

export type PromptPayIdentifier =
  | { type: "mobile"; value: string }
  | { type: "nationalId"; value: string }
  | { type: "ewallet"; value: string }
  | { type: "bankAccount"; value: string };

export type EncodablePromptPayIdentifier = Exclude<
  PromptPayIdentifier,
  { type: "bankAccount" }
>;

export type PromptPayData = {
  aid: "A000000677010111";
  identifier: PromptPayIdentifier;
};

export type GeneratePromptPayOptions = {
  identifier: EncodablePromptPayIdentifier;
  amount?: number | string;
  merchantCategoryCode?: string;
};

export type ParsedPromptPayPayload = {
  payload: string;
  dataObjects: DataObject[];
  emvco: EMVCoData;
  promptPay: PromptPayData;
};

// #region TLV
function serializeTLV(objects: DataObject[]): string {
  return objects
    .map((object, index) => {
      if (!Number.isInteger(object.tag) || object.tag < 0 || object.tag > 99)
        throw new Error(`Tag ${index} must be 00-99`);

      const value =
        object.type === "primitive" ? object.value : serializeTLV(object.value);

      if (value.length > 99)
        throw new Error(`Value ${index} exceeds TLV length limit`);

      const tag = object.tag.toString().padStart(2, "0");
      const length = value.length.toString().padStart(2, "0");
      return `${tag}${length}${value}`;
    })
    .join("");
}

function parseTLV(payload: string): DataObject[] {
  const objects: DataObject[] = [];
  let index = 0;

  while (index < payload.length) {
    if (index + 4 > payload.length)
      throw new Error(
        `Malformed TLV payload: incomplete headers at index ${index}`,
      );

    const tagString = payload.slice(index, index + 2);
    if (!/^\d{2}$/.test(tagString))
      throw new Error(
        `Malformed TLV payload: invalid tag "${tagString}" at index ${index}`,
      );
    const tag = Number.parseInt(tagString, 10);
    index += 2;

    const lengthString = payload.slice(index, index + 2);
    if (!/^\d{2}$/.test(lengthString))
      throw new Error(
        `Malformed TLV payload: invalid length "${lengthString}" at index ${index}`,
      );
    const length = Number.parseInt(lengthString, 10);
    index += 2;

    if (index + length > payload.length)
      throw new Error(
        `Malformed TLV payload: expected value length ${length} at index ${index}, but reached end of string`,
      );

    const value = payload.slice(index, index + length);
    index += length;
    objects.push({ type: "primitive", tag, value });
  }

  return objects;
}

// #region Utilities
function primitive(
  data: DataObject[] | undefined,
  tag: number,
): string | undefined {
  return data?.find(
    (object): object is Extract<DataObject, { type: "primitive" }> =>
      object.tag === tag && object.type === "primitive",
  )?.value;
}

function optionalProperty<T extends string>(key: string, value: T | undefined) {
  return value === undefined ? {} : { [key]: value };
}

// #region EMVCo
const TEMPLATE_TAGS = new Set([
  ...Array.from({ length: 50 }, (_, index) => index + 2),
  62,
  64,
  ...Array.from({ length: 20 }, (_, index) => index + 80),
]);

function parseEMVCo(payload: string): DataObject[] {
  return parseTLV(payload).map((object) =>
    TEMPLATE_TAGS.has(object.tag) && object.type === "primitive"
      ? {
          type: "template",
          tag: object.tag,
          value: parseTLV(object.value),
        }
      : object,
  );
}

const emvCoSchema = z.object({
  payloadFormatIndicator: z.literal("01"),
  pointOfInitiationMethod: z.enum(["11", "12"]).optional(),
  paymentNetworkSpecific: z.array(
    z.object({
      tag: z.number().int().min(2).max(51),
      value: z.custom<DataObject[]>((value) => Array.isArray(value)),
    }),
  ),
  merchantCategoryCode: z.string().length(4).optional(),
  transactionCurrency: z.string().length(3).optional(),
  transactionAmount: z.string().optional(),
  countryCode: z.string().length(2),
  additionalData: z.array(z.custom<DataObject>()).optional(),
});

const MODELED_EMVCO_TAGS = new Set([0, 1, 52, 53, 54, 58]);

function decodeEMVCo(objects: DataObject[]): EMVCoData {
  const additionalData = objects.filter(
    (object) =>
      !MODELED_EMVCO_TAGS.has(object.tag) &&
      !(object.tag >= 2 && object.tag <= 51),
  );

  return emvCoSchema.parse({
    payloadFormatIndicator: primitive(objects, 0),
    ...optionalProperty("pointOfInitiationMethod", primitive(objects, 1)),
    paymentNetworkSpecific: objects
      .filter(
        (object): object is Extract<DataObject, { type: "template" }> =>
          object.type === "template" && object.tag >= 2 && object.tag <= 51,
      )
      .map(({ tag, value }) => ({ tag, value })),
    ...optionalProperty("merchantCategoryCode", primitive(objects, 52)),
    ...optionalProperty("transactionCurrency", primitive(objects, 53)),
    ...optionalProperty("transactionAmount", primitive(objects, 54)),
    countryCode: primitive(objects, 58),
    ...(additionalData.length === 0 ? {} : { additionalData }),
  });
}

function encodeEMVCo(data: EMVCoData): DataObject[] {
  const parsed = emvCoSchema.parse(data);
  const objects: DataObject[] = [
    { type: "primitive", tag: 0, value: parsed.payloadFormatIndicator },
  ];

  if (parsed.pointOfInitiationMethod !== undefined)
    objects.push({
      type: "primitive",
      tag: 1,
      value: parsed.pointOfInitiationMethod,
    });

  objects.push(
    ...parsed.paymentNetworkSpecific.map(
      ({ tag, value }): DataObject => ({ type: "template", tag, value }),
    ),
  );

  for (const [tag, value] of [
    [52, parsed.merchantCategoryCode],
    [53, parsed.transactionCurrency],
    [54, parsed.transactionAmount],
    [58, parsed.countryCode],
  ] as const) {
    if (value !== undefined) objects.push({ type: "primitive", tag, value });
  }

  objects.push(...(parsed.additionalData ?? []));
  return objects;
}

// #region CRC
function crc16(data: Uint8Array): number {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (const byte of data) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++)
      crc =
        (crc & 0x8000) !== 0
          ? ((crc << 1) ^ polynomial) & 0xffff
          : (crc << 1) & 0xffff;
  }

  return crc;
}

function formatCRC(crc: number): string {
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function verifyCRC(payload: string): boolean {
  if (payload.length < 8 || payload.slice(-8, -4) !== "6304") return false;

  const expected = payload.slice(-4);
  const calculated = formatCRC(
    crc16(new TextEncoder().encode(payload.slice(0, -4))),
  );
  return calculated === expected;
}

function appendCRC(payload: string): string {
  const body = `${payload}6304`;
  return `${body}${formatCRC(crc16(new TextEncoder().encode(body)))}`;
}

// #region PromptPay
const PROMPTPAY_AID = "A000000677010111" as const;

const promptPaySchema = z.object({
  aid: z.literal(PROMPTPAY_AID),
  identifier: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("mobile"),
      value: z.string().regex(/^\d{13}$/),
    }),
    z.object({
      type: z.literal("nationalId"),
      value: z.string().regex(/^\d{13}$/),
    }),
    z.object({
      type: z.literal("ewallet"),
      value: z.string().regex(/^\d{15}$/),
    }),
    z.object({
      type: z.literal("bankAccount"),
      value: z.string().regex(/^\d{1,43}$/),
    }),
  ]),
});

const IDENTIFIER_TYPES = {
  1: "mobile",
  2: "nationalId",
  3: "ewallet",
  4: "bankAccount",
} as const;

const IDENTIFIER_TAGS = {
  mobile: 1,
  nationalId: 2,
  ewallet: 3,
} as const;

function decodePromptPay(merchantAccount: DataObject[]): PromptPayData {
  const identifiers = merchantAccount.filter(
    (object): object is Extract<DataObject, { type: "primitive" }> =>
      object.type === "primitive" && object.tag in IDENTIFIER_TYPES,
  );

  if (identifiers.length !== 1)
    throw new Error("Expected exactly one PromptPay identifier.");

  const identifier = identifiers[0];
  return promptPaySchema.parse({
    aid: primitive(merchantAccount, 0),
    identifier: {
      type: IDENTIFIER_TYPES[identifier.tag as keyof typeof IDENTIFIER_TYPES],
      value: identifier.value,
    },
  });
}

function encodePromptPay(
  identifier: EncodablePromptPayIdentifier,
): DataObject[] {
  const parsed = promptPaySchema.shape.identifier.parse(identifier);
  if (parsed.type === "bankAccount")
    throw new Error(
      "PromptPay bank account encoding is reserved for future use.",
    );

  return [
    { type: "primitive", tag: 0, value: PROMPTPAY_AID },
    {
      type: "primitive",
      tag: IDENTIFIER_TAGS[parsed.type],
      value: parsed.value,
    },
  ];
}

function normalizePromptPayIdentifier(
  identifier: EncodablePromptPayIdentifier,
): EncodablePromptPayIdentifier {
  const value = identifier.value.trim();

  if (identifier.type === "mobile") {
    if (!/^\+?[\d\s()-]+$/.test(value))
      throw new Error("PromptPay mobile number contains invalid characters.");

    const digits = value.replace(/\D/g, "");
    const canonical = /^0\d{9}$/.test(digits)
      ? `0066${digits.slice(1)}`
      : /^66\d{9}$/.test(digits)
        ? `00${digits}`
        : digits;

    return promptPaySchema.shape.identifier.parse({
      type: "mobile",
      value: canonical,
    }) as EncodablePromptPayIdentifier;
  }

  if (!/^[\d\s-]+$/.test(value))
    throw new Error(
      `PromptPay ${identifier.type} contains invalid characters.`,
    );

  return promptPaySchema.shape.identifier.parse({
    type: identifier.type,
    value: value.replace(/[\s-]/g, ""),
  }) as EncodablePromptPayIdentifier;
}

function formatAmount(amount: number | string): string {
  let formatted = "";
  if (typeof amount === "number") {
    if (Number.isFinite(amount)) formatted = amount.toFixed(2);
  } else {
    const value = amount.trim();
    if (/^\d+(?:\.\d{1,2})?$/.test(value)) {
      const [integer, fraction = ""] = value.split(".");
      formatted = `${integer}.${fraction.padEnd(2, "0")}`;
    }
  }

  if (!/^\d+\.\d{2}$/.test(formatted) || Number(formatted) <= 0)
    throw new Error(
      "PromptPay amount must be a positive number with at most 2 decimals.",
    );
  if (formatted.length > 13)
    throw new Error("PromptPay amount exceeds the EMVCo length limit.");

  return formatted;
}

function generatePromptPayPayload(options: GeneratePromptPayOptions): string {
  const identifier = normalizePromptPayIdentifier(options.identifier);
  const amount =
    options.amount === undefined ? undefined : formatAmount(options.amount);

  if (
    options.merchantCategoryCode !== undefined &&
    !/^\d{4}$/.test(options.merchantCategoryCode)
  )
    throw new Error("PromptPay merchant category code must be 4 digits.");

  const objects: DataObject[] = [
    { type: "primitive", tag: 0, value: "01" },
    {
      type: "primitive",
      tag: 1,
      value: amount === undefined ? "11" : "12",
    },
    { type: "template", tag: 29, value: encodePromptPay(identifier) },
  ];

  if (options.merchantCategoryCode !== undefined)
    objects.push({
      type: "primitive",
      tag: 52,
      value: options.merchantCategoryCode,
    });

  // This ordering matches established Thai banking implementations and fixtures.
  objects.push(
    { type: "primitive", tag: 58, value: "TH" },
    { type: "primitive", tag: 53, value: "764" },
  );
  if (amount !== undefined)
    objects.push({ type: "primitive", tag: 54, value: amount });

  return appendCRC(serializeTLV(objects));
}

function parsePromptPayPayload(payload: string): ParsedPromptPayPayload {
  if (!verifyCRC(payload)) throw new Error("Invalid PromptPay payload CRC.");

  const dataObjects = parseEMVCo(payload);
  const crc = dataObjects.at(-1);
  if (crc?.type !== "primitive" || crc.tag !== 63)
    throw new Error("PromptPay payload is missing its CRC data object.");

  const emvco = decodeEMVCo(dataObjects.slice(0, -1));
  if (emvco.transactionCurrency !== "764")
    throw new Error("PromptPay transaction currency must be THB (764).");
  if (emvco.countryCode !== "TH")
    throw new Error("Domestic PromptPay country code must be TH.");

  const promptPayTemplates = emvco.paymentNetworkSpecific.filter(
    ({ tag }) => tag === 29,
  );
  if (promptPayTemplates.length !== 1)
    throw new Error(
      "Expected exactly one PromptPay merchant account template.",
    );

  return {
    payload,
    dataObjects,
    emvco,
    promptPay: decodePromptPay(promptPayTemplates[0].value),
  };
}

export {
  appendCRC,
  crc16,
  decodeEMVCo,
  decodePromptPay,
  encodeEMVCo,
  encodePromptPay,
  formatCRC,
  generatePromptPayPayload,
  normalizePromptPayIdentifier,
  parseEMVCo,
  parsePromptPayPayload,
  parseTLV,
  serializeTLV,
  verifyCRC,
};
