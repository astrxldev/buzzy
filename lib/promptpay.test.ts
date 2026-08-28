import { describe, expect, test } from "bun:test";
import {
  crc16,
  type DataObject,
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
} from "./promptpay";

const encoder = new TextEncoder();
const example =
  "00020101021129370016A000000677010111021311111111111115802TH530376463047B5A";

function withCRC(payload: string): string {
  const body = `${payload}6304`;
  return `${body}${formatCRC(crc16(encoder.encode(body)))}`;
}

describe("serializeTLV", () => {
  test("serializes primitive data objects", () => {
    expect(
      serializeTLV([
        { type: "primitive", tag: 0, value: "01" },
        { type: "primitive", tag: 58, value: "TH" },
      ]),
    ).toBe("0002015802TH");
  });

  test("pads single-digit tags and lengths", () => {
    expect(serializeTLV([{ type: "primitive", tag: 7, value: "x" }])).toBe(
      "0701x",
    );
  });

  test("serializes nested templates", () => {
    const objects: DataObject[] = [
      {
        type: "template",
        tag: 29,
        value: [
          { type: "primitive", tag: 0, value: "A000000677010111" },
          { type: "primitive", tag: 2, value: "1111111111111" },
        ],
      },
    ];

    expect(serializeTLV(objects)).toBe(
      "29370016A00000067701011102131111111111111",
    );
  });

  test("serializes empty input and empty values", () => {
    expect(serializeTLV([])).toBe("");
    expect(serializeTLV([{ type: "primitive", tag: 99, value: "" }])).toBe(
      "9900",
    );
  });

  test("accepts the maximum tag and value length", () => {
    const value = "x".repeat(99);
    expect(serializeTLV([{ type: "primitive", tag: 99, value }])).toBe(
      `9999${value}`,
    );
  });

  test.each([-1, 100])("rejects out-of-range tag %d", (tag) => {
    expect(() =>
      serializeTLV([{ type: "primitive", tag, value: "x" }]),
    ).toThrow("Tag 0 must be 00-99");
  });

  test("reports the index of an invalid tag", () => {
    expect(() =>
      serializeTLV([
        { type: "primitive", tag: 0, value: "01" },
        { type: "primitive", tag: 101, value: "x" },
      ]),
    ).toThrow("Tag 1 must be 00-99");
  });

  test("rejects values longer than the two-digit length field", () => {
    expect(() =>
      serializeTLV([{ type: "primitive", tag: 0, value: "x".repeat(100) }]),
    ).toThrow("Value 0 exceeds TLV length limit");
  });

  test("rejects templates whose serialized value is too long", () => {
    expect(() =>
      serializeTLV([
        {
          type: "template",
          tag: 29,
          value: [{ type: "primitive", tag: 0, value: "x".repeat(96) }],
        },
      ]),
    ).toThrow("Value 0 exceeds TLV length limit");
  });
});

describe("parseTLV", () => {
  test("parses multiple primitive data objects", () => {
    expect(parseTLV("00020153037645802TH")).toEqual([
      { type: "primitive", tag: 0, value: "01" },
      { type: "primitive", tag: 53, value: "764" },
      { type: "primitive", tag: 58, value: "TH" },
    ]);
  });

  test("parses empty payloads and zero-length values", () => {
    expect(parseTLV("")).toEqual([]);
    expect(parseTLV("9900")).toEqual([
      { type: "primitive", tag: 99, value: "" },
    ]);
  });

  test("preserves values verbatim", () => {
    expect(parseTLV("1006aB 1!?")).toEqual([
      { type: "primitive", tag: 10, value: "aB 1!?" },
    ]);
  });

  test.each([
    "0",
    "000",
    "0001x00",
  ])("rejects an incomplete header in %p", (payload) => {
    expect(() => parseTLV(payload)).toThrow(
      /Malformed TLV payload: incomplete headers at index/,
    );
  });

  test.each([
    "AA00",
    "0A00",
    " 100",
  ])("rejects invalid tags in %p", (payload) => {
    expect(() => parseTLV(payload)).toThrow(
      /Malformed TLV payload: invalid tag/,
    );
  });

  test.each([
    "00AA",
    "000A",
    "00 1",
  ])("rejects invalid lengths in %p", (payload) => {
    expect(() => parseTLV(payload)).toThrow(
      /Malformed TLV payload: invalid length/,
    );
  });

  test("rejects a value shorter than its declared length", () => {
    expect(() => parseTLV("0005abc")).toThrow(
      "Malformed TLV payload: expected value length 5 at index 4, but reached end of string",
    );
  });

  test("reports malformed trailing data after valid objects", () => {
    expect(() => parseTLV("000201x")).toThrow(
      "Malformed TLV payload: incomplete headers at index 6",
    );
  });

  test("round-trips serialized primitive objects", () => {
    const objects: DataObject[] = [
      { type: "primitive", tag: 0, value: "01" },
      { type: "primitive", tag: 1, value: "12" },
      { type: "primitive", tag: 54, value: "125.50" },
    ];

    expect(parseTLV(serializeTLV(objects))).toEqual(objects);
  });
});

describe("parseEMVCo", () => {
  test("parses merchant account information as a template", () => {
    expect(parseEMVCo(example.slice(0, -8))).toEqual([
      { type: "primitive", tag: 0, value: "01" },
      { type: "primitive", tag: 1, value: "11" },
      {
        type: "template",
        tag: 29,
        value: [
          { type: "primitive", tag: 0, value: "A000000677010111" },
          { type: "primitive", tag: 2, value: "1111111111111" },
        ],
      },
      { type: "primitive", tag: 58, value: "TH" },
      { type: "primitive", tag: 53, value: "764" },
    ]);
  });

  test("leaves non-template tags primitive", () => {
    expect(parseEMVCo("0002015303764")).toEqual([
      { type: "primitive", tag: 0, value: "01" },
      { type: "primitive", tag: 53, value: "764" },
    ]);
  });

  test("rejects malformed TLV inside a template", () => {
    expect(() => parseEMVCo("29050005x")).toThrow(/Malformed TLV payload/);
  });
});

describe("decodeEMVCo", () => {
  test("decodes the example payload", () => {
    expect(decodeEMVCo(parseEMVCo(example.slice(0, -8)))).toEqual({
      payloadFormatIndicator: "01",
      pointOfInitiationMethod: "11",
      paymentNetworkSpecific: [
        {
          tag: 29,
          value: [
            { type: "primitive", tag: 0, value: "A000000677010111" },
            { type: "primitive", tag: 2, value: "1111111111111" },
          ],
        },
      ],
      transactionCurrency: "764",
      countryCode: "TH",
    });
  });

  test("decodes optional amount and dynamic initiation method", () => {
    const payload = "00020101021253037645406125.505802TH";
    expect(decodeEMVCo(parseEMVCo(payload))).toEqual({
      payloadFormatIndicator: "01",
      pointOfInitiationMethod: "12",
      paymentNetworkSpecific: [],
      transactionCurrency: "764",
      transactionAmount: "125.50",
      countryCode: "TH",
    });
  });

  test("decodes an optional merchant category code", () => {
    expect(
      decodeEMVCo([
        { type: "primitive", tag: 0, value: "01" },
        { type: "primitive", tag: 52, value: "0000" },
        { type: "primitive", tag: 58, value: "TH" },
      ]),
    ).toEqual({
      payloadFormatIndicator: "01",
      paymentNetworkSpecific: [],
      merchantCategoryCode: "0000",
      countryCode: "TH",
    });
  });

  test("allows all optional fields to be absent", () => {
    expect(
      decodeEMVCo([
        { type: "primitive", tag: 0, value: "01" },
        { type: "primitive", tag: 58, value: "TH" },
      ]),
    ).toEqual({
      payloadFormatIndicator: "01",
      countryCode: "TH",
      paymentNetworkSpecific: [],
    });
  });

  test("preserves unknown tags", () => {
    expect(
      decodeEMVCo([
        { type: "primitive", tag: 0, value: "01" },
        { type: "primitive", tag: 58, value: "TH" },
        { type: "primitive", tag: 59, value: "ignored" },
      ]),
    ).toEqual({
      payloadFormatIndicator: "01",
      countryCode: "TH",
      paymentNetworkSpecific: [],
      additionalData: [{ type: "primitive", tag: 59, value: "ignored" }],
    });
  });

  test.each([
    {
      name: "missing payload format indicator",
      objects: [{ type: "primitive", tag: 58, value: "TH" }],
    },
    {
      name: "unsupported payload format indicator",
      objects: [
        { type: "primitive", tag: 0, value: "02" },
        { type: "primitive", tag: 58, value: "TH" },
      ],
    },
    {
      name: "unsupported initiation method",
      objects: [
        { type: "primitive", tag: 0, value: "01" },
        { type: "primitive", tag: 1, value: "13" },
        { type: "primitive", tag: 58, value: "TH" },
      ],
    },
    {
      name: "invalid currency length",
      objects: [
        { type: "primitive", tag: 0, value: "01" },
        { type: "primitive", tag: 53, value: "76" },
        { type: "primitive", tag: 58, value: "TH" },
      ],
    },
    {
      name: "missing country code",
      objects: [{ type: "primitive", tag: 0, value: "01" }],
    },
    {
      name: "invalid country code length",
      objects: [
        { type: "primitive", tag: 0, value: "01" },
        { type: "primitive", tag: 58, value: "THA" },
      ],
    },
  ] satisfies { name: string; objects: DataObject[] }[])("rejects $name", ({
    objects,
  }) => {
    expect(() => decodeEMVCo(objects)).toThrow();
  });
});

describe("encodeEMVCo", () => {
  test("encodes a complete payload in EMVCo tag order", () => {
    expect(
      encodeEMVCo({
        payloadFormatIndicator: "01",
        pointOfInitiationMethod: "12",
        paymentNetworkSpecific: [
          {
            tag: 29,
            value: [
              { type: "primitive", tag: 0, value: "A000000677010111" },
              { type: "primitive", tag: 2, value: "0812345678" },
            ],
          },
        ],
        merchantCategoryCode: "0000",
        transactionCurrency: "764",
        transactionAmount: "125.50",
        countryCode: "TH",
      }),
    ).toEqual([
      { type: "primitive", tag: 0, value: "01" },
      { type: "primitive", tag: 1, value: "12" },
      {
        type: "template",
        tag: 29,
        value: [
          { type: "primitive", tag: 0, value: "A000000677010111" },
          { type: "primitive", tag: 2, value: "0812345678" },
        ],
      },
      { type: "primitive", tag: 52, value: "0000" },
      { type: "primitive", tag: 53, value: "764" },
      { type: "primitive", tag: 54, value: "125.50" },
      { type: "primitive", tag: 58, value: "TH" },
    ]);
  });

  test("encodes the minimal valid payload", () => {
    expect(
      encodeEMVCo({
        payloadFormatIndicator: "01",
        paymentNetworkSpecific: [],
        countryCode: "TH",
      }),
    ).toEqual([
      { type: "primitive", tag: 0, value: "01" },
      { type: "primitive", tag: 58, value: "TH" },
    ]);
  });

  test("preserves the order and contents of payment network templates", () => {
    const first: DataObject[] = [
      { type: "primitive", tag: 0, value: "network-one" },
    ];
    const second: DataObject[] = [
      { type: "primitive", tag: 0, value: "network-two" },
      {
        type: "template",
        tag: 80,
        value: [{ type: "primitive", tag: 1, value: "nested" }],
      },
    ];

    expect(
      encodeEMVCo({
        payloadFormatIndicator: "01",
        paymentNetworkSpecific: [
          { tag: 26, value: first },
          { tag: 51, value: second },
        ],
        countryCode: "TH",
      }),
    ).toEqual([
      { type: "primitive", tag: 0, value: "01" },
      { type: "template", tag: 26, value: first },
      { type: "template", tag: 51, value: second },
      { type: "primitive", tag: 58, value: "TH" },
    ]);
  });

  test("produces data objects that serialize and parse losslessly", () => {
    const encoded = encodeEMVCo({
      payloadFormatIndicator: "01",
      pointOfInitiationMethod: "11",
      paymentNetworkSpecific: [
        {
          tag: 29,
          value: [
            { type: "primitive", tag: 0, value: "A000000677010111" },
            { type: "primitive", tag: 2, value: "1111111111111" },
          ],
        },
      ],
      transactionCurrency: "764",
      countryCode: "TH",
    });

    expect(parseEMVCo(serializeTLV(encoded))).toEqual(encoded);
  });

  test("round-trips through decodeEMVCo", () => {
    const data = {
      payloadFormatIndicator: "01" as const,
      pointOfInitiationMethod: "12" as const,
      paymentNetworkSpecific: [
        {
          tag: 29,
          value: [
            { type: "primitive" as const, tag: 0, value: "A000000677010111" },
            { type: "primitive" as const, tag: 2, value: "0812345678" },
          ],
        },
      ],
      transactionCurrency: "764",
      transactionAmount: "99.95",
      countryCode: "TH",
    };

    expect(decodeEMVCo(encodeEMVCo(data))).toEqual(data);
  });

  test("does not mutate its input", () => {
    const data = {
      payloadFormatIndicator: "01" as const,
      paymentNetworkSpecific: [
        {
          tag: 29,
          value: [{ type: "primitive" as const, tag: 0, value: "aid" }],
        },
      ],
      countryCode: "TH",
    };
    const snapshot = structuredClone(data);

    encodeEMVCo(data);

    expect(data).toEqual(snapshot);
  });

  test("retains additional data through decoding and encoding", () => {
    const objects: DataObject[] = [
      { type: "primitive", tag: 0, value: "01" },
      { type: "primitive", tag: 58, value: "TH" },
      { type: "primitive", tag: 59, value: "MERCHANT" },
      { type: "primitive", tag: 60, value: "BANGKOK" },
    ];

    expect(encodeEMVCo(decodeEMVCo(objects))).toEqual(objects);
  });

  test.each([
    {
      name: "missing payload format indicator",
      data: { paymentNetworkSpecific: [], countryCode: "TH" },
    },
    {
      name: "unsupported payload format indicator",
      data: {
        payloadFormatIndicator: "02",
        paymentNetworkSpecific: [],
        countryCode: "TH",
      },
    },
    {
      name: "unsupported initiation method",
      data: {
        payloadFormatIndicator: "01",
        pointOfInitiationMethod: "13",
        paymentNetworkSpecific: [],
        countryCode: "TH",
      },
    },
    {
      name: "missing payment network list",
      data: { payloadFormatIndicator: "01", countryCode: "TH" },
    },
    {
      name: "invalid merchant category code length",
      data: {
        payloadFormatIndicator: "01",
        paymentNetworkSpecific: [],
        merchantCategoryCode: "000",
        countryCode: "TH",
      },
    },
    {
      name: "invalid currency length",
      data: {
        payloadFormatIndicator: "01",
        paymentNetworkSpecific: [],
        transactionCurrency: "76",
        countryCode: "TH",
      },
    },
    {
      name: "missing country code",
      data: { payloadFormatIndicator: "01", paymentNetworkSpecific: [] },
    },
    {
      name: "invalid country code length",
      data: {
        payloadFormatIndicator: "01",
        paymentNetworkSpecific: [],
        countryCode: "THA",
      },
    },
  ])("rejects $name", ({ data }) => {
    expect(() => encodeEMVCo(data as never)).toThrow();
  });
});

describe("decodePromptPay", () => {
  const aid: DataObject = {
    type: "primitive",
    tag: 0,
    value: "A000000677010111",
  };

  test.each([
    { tag: 1, type: "mobile", value: "0066812345678" },
    { tag: 2, type: "nationalId", value: "1234567890123" },
    { tag: 3, type: "ewallet", value: "123456789012345" },
    { tag: 4, type: "bankAccount", value: "1234567890" },
  ] as const)("decodes a $type identifier", ({ tag, type, value }) => {
    expect(decodePromptPay([aid, { type: "primitive", tag, value }])).toEqual({
      aid: "A000000677010111",
      identifier: { type, value },
    });
  });

  test("decodes merchant account information parsed from an EMVCo payload", () => {
    const objects = parseEMVCo("29370016A00000067701011102131111111111111");
    const merchantAccount = objects[0];

    expect(merchantAccount?.type).toBe("template");
    if (merchantAccount?.type !== "template") return;

    expect(decodePromptPay(merchantAccount.value)).toEqual({
      aid: "A000000677010111",
      identifier: { type: "nationalId", value: "1111111111111" },
    });
  });

  test("rejects multiple recognized identifiers", () => {
    expect(() =>
      decodePromptPay([
        aid,
        { type: "primitive", tag: 4, value: "1234567890" },
        { type: "primitive", tag: 2, value: "1234567890123" },
      ]),
    ).toThrow("Expected exactly one PromptPay identifier.");
  });

  test("ignores unknown tags before a recognized identifier", () => {
    expect(
      decodePromptPay([
        { type: "primitive", tag: 99, value: "ignored" },
        aid,
        { type: "primitive", tag: 2, value: "1234567890123" },
      ]),
    ).toEqual({
      aid: "A000000677010111",
      identifier: { type: "nationalId", value: "1234567890123" },
    });
  });

  test("ignores template objects using identifier tags", () => {
    expect(
      decodePromptPay([
        aid,
        {
          type: "template",
          tag: 1,
          value: [{ type: "primitive", tag: 0, value: "ignored" }],
        },
        { type: "primitive", tag: 3, value: "123456789012345" },
      ]),
    ).toEqual({
      aid: "A000000677010111",
      identifier: { type: "ewallet", value: "123456789012345" },
    });
  });

  test("accepts a bank account at its maximum length", () => {
    const value = "1".repeat(43);
    expect(
      decodePromptPay([aid, { type: "primitive", tag: 4, value }]).identifier,
    ).toEqual({ type: "bankAccount", value });
  });

  test.each([
    { tag: 1, value: "1".repeat(12), name: "short mobile" },
    { tag: 1, value: "1".repeat(14), name: "long mobile" },
    { tag: 2, value: "1".repeat(12), name: "short national ID" },
    { tag: 2, value: "1".repeat(14), name: "long national ID" },
    { tag: 3, value: "1".repeat(14), name: "short e-wallet ID" },
    { tag: 3, value: "1".repeat(16), name: "long e-wallet ID" },
    { tag: 4, value: "1".repeat(44), name: "long bank account" },
  ])("rejects a $name", ({ tag, value }) => {
    expect(() =>
      decodePromptPay([aid, { type: "primitive", tag, value }]),
    ).toThrow();
  });

  test("rejects input without a recognized identifier", () => {
    expect(() => decodePromptPay([aid])).toThrow(
      "Expected exactly one PromptPay identifier.",
    );
    expect(() =>
      decodePromptPay([aid, { type: "primitive", tag: 5, value: "unknown" }]),
    ).toThrow("Expected exactly one PromptPay identifier.");
  });

  test("rejects a missing or incorrect AID", () => {
    const identifier: DataObject = {
      type: "primitive",
      tag: 2,
      value: "1234567890123",
    };

    expect(() => decodePromptPay([identifier])).toThrow();
    expect(() =>
      decodePromptPay([
        { type: "primitive", tag: 0, value: "A000000000000000" },
        identifier,
      ]),
    ).toThrow();
  });

  test("rejects a template AID", () => {
    expect(() =>
      decodePromptPay([
        { type: "template", tag: 0, value: [] },
        { type: "primitive", tag: 1, value: "0066812345678" },
      ]),
    ).toThrow();
  });
});

describe("encodePromptPay", () => {
  test.each([
    { type: "mobile", tag: 1, value: "0066812345678" },
    { type: "nationalId", tag: 2, value: "1234567890123" },
    { type: "ewallet", tag: 3, value: "123456789012345" },
  ] as const)("encodes a canonical $type identifier", ({
    type,
    tag,
    value,
  }) => {
    expect(encodePromptPay({ type, value })).toEqual([
      {
        type: "primitive",
        tag: 0,
        value: "A000000677010111",
      },
      { type: "primitive", tag, value },
    ]);
  });

  test("rejects noncanonical identifier values", () => {
    expect(() =>
      encodePromptPay({ type: "mobile", value: "0812345678" }),
    ).toThrow();
    expect(() =>
      encodePromptPay({ type: "nationalId", value: "123-456" }),
    ).toThrow();
    expect(() =>
      encodePromptPay({ type: "ewallet", value: "A".repeat(15) }),
    ).toThrow();
  });

  test("does not encode the reserved bank account identifier", () => {
    expect(() =>
      encodePromptPay({ type: "bankAccount", value: "1234567890" } as never),
    ).toThrow("reserved for future use");
  });
});

describe("normalizePromptPayIdentifier", () => {
  test.each([
    ["0801234567", "0066801234567"],
    ["080-123-4567", "0066801234567"],
    ["+66-89-123-4567", "0066891234567"],
    ["66 89 123 4567", "0066891234567"],
    ["0066812345678", "0066812345678"],
  ])("normalizes mobile %s", (value, expected) => {
    expect(normalizePromptPayIdentifier({ type: "mobile", value })).toEqual({
      type: "mobile",
      value: expected,
    });
  });

  test("normalizes formatted national IDs", () => {
    expect(
      normalizePromptPayIdentifier({
        type: "nationalId",
        value: "1-2345-67890-12-3",
      }),
    ).toEqual({ type: "nationalId", value: "1234567890123" });
  });

  test("normalizes formatted e-wallet IDs", () => {
    expect(
      normalizePromptPayIdentifier({
        type: "ewallet",
        value: "012 345 678 901 234",
      }),
    ).toEqual({ type: "ewallet", value: "012345678901234" });
  });

  test.each([
    { type: "mobile", value: "08123abc", name: "mobile with letters" },
    { type: "mobile", value: "081234567", name: "short mobile" },
    {
      type: "nationalId",
      value: "123456789012A",
      name: "national ID with letters",
    },
    {
      type: "nationalId",
      value: "123456789012",
      name: "short national ID",
    },
    {
      type: "ewallet",
      value: "12345678901234",
      name: "short e-wallet ID",
    },
  ] as const)("rejects a $name", ({ type, value }) => {
    expect(() => normalizePromptPayIdentifier({ type, value })).toThrow();
  });
});

describe("generatePromptPayPayload", () => {
  test.each([
    {
      name: "local mobile number",
      options: {
        identifier: { type: "mobile" as const, value: "0801234567" },
      },
      expected:
        "00020101021129370016A000000677010111011300668012345675802TH530376463046197",
    },
    {
      name: "formatted international mobile number",
      options: {
        identifier: { type: "mobile" as const, value: "+66-89-123-4567" },
      },
      expected:
        "00020101021129370016A000000677010111011300668912345675802TH5303764630429C1",
    },
    {
      name: "national ID",
      options: {
        identifier: {
          type: "nationalId" as const,
          value: "1-1111-11111-11-1",
        },
      },
      expected:
        "00020101021129370016A000000677010111021311111111111115802TH530376463047B5A",
    },
    {
      name: "tax ID",
      options: {
        identifier: {
          type: "nationalId" as const,
          value: "0123456789012",
        },
      },
      expected:
        "00020101021129370016A000000677010111021301234567890125802TH530376463040CBD",
    },
    {
      name: "e-wallet ID",
      options: {
        identifier: {
          type: "ewallet" as const,
          value: "012345678901234",
        },
      },
      expected:
        "00020101021129390016A00000067701011103150123456789012345802TH530376463049781",
    },
    {
      name: "dynamic amount",
      options: {
        identifier: { type: "mobile" as const, value: "000-000-0000" },
        amount: 4.22,
      },
      expected:
        "00020101021229370016A000000677010111011300660000000005802TH530376454044.226304E469",
    },
  ])("matches the published $name vector", ({ options, expected }) => {
    expect(generatePromptPayPayload(options)).toBe(expected);
  });

  test.each([
    ["4", "4.00"],
    ["10", "10.00"],
    [" 10 ", "10.00"],
    ["4.2", "4.20"],
    ["4.22", "4.22"],
    [4, "4.00"],
    [4.2, "4.20"],
  ] as const)("formats amount %p as %s", (amount, expected) => {
    const parsed = parsePromptPayPayload(
      generatePromptPayPayload({
        identifier: { type: "mobile", value: "0801234567" },
        amount,
      }),
    );
    expect(parsed.emvco.transactionAmount).toBe(expected);
    expect(parsed.emvco.pointOfInitiationMethod).toBe("12");
  });

  test("emits an optional merchant category code", () => {
    const parsed = parsePromptPayPayload(
      generatePromptPayPayload({
        identifier: { type: "mobile", value: "0801234567" },
        merchantCategoryCode: "0000",
      }),
    );
    expect(parsed.emvco.merchantCategoryCode).toBe("0000");
  });

  test.each([
    0,
    -1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    "",
    "1.234",
  ])("rejects invalid amount %p", (amount) => {
    expect(() =>
      generatePromptPayPayload({
        identifier: { type: "mobile", value: "0801234567" },
        amount,
      }),
    ).toThrow();
  });

  test("rejects invalid merchant category codes", () => {
    expect(() =>
      generatePromptPayPayload({
        identifier: { type: "mobile", value: "0801234567" },
        merchantCategoryCode: "123",
      }),
    ).toThrow("must be 4 digits");
  });
});

describe("parsePromptPayPayload", () => {
  test("returns the raw, EMVCo, and PromptPay representations", () => {
    const payload = generatePromptPayPayload({
      identifier: { type: "mobile", value: "0801234567" },
      amount: "19.90",
    });
    const parsed = parsePromptPayPayload(payload);

    expect(parsed.payload).toBe(payload);
    expect(parsed.dataObjects.at(-1)).toEqual({
      type: "primitive",
      tag: 63,
      value: payload.slice(-4),
    });
    expect(parsed.emvco).toMatchObject({
      payloadFormatIndicator: "01",
      pointOfInitiationMethod: "12",
      transactionCurrency: "764",
      transactionAmount: "19.90",
      countryCode: "TH",
    });
    expect(parsed.promptPay).toEqual({
      aid: "A000000677010111",
      identifier: { type: "mobile", value: "0066801234567" },
    });
  });

  test("preserves unmodeled EMVCo data", () => {
    const generated = generatePromptPayPayload({
      identifier: { type: "nationalId", value: "1234567890123" },
    });
    const payload = withCRC(`${generated.slice(0, -8)}5904TEST`);

    expect(parsePromptPayPayload(payload).emvco.additionalData).toEqual([
      { type: "primitive", tag: 59, value: "TEST" },
    ]);
  });

  test("rejects a corrupted checksum", () => {
    const payload = generatePromptPayPayload({
      identifier: { type: "mobile", value: "0801234567" },
    });
    expect(() => parsePromptPayPayload(`${payload.slice(0, -1)}0`)).toThrow(
      "Invalid PromptPay payload CRC",
    );
  });

  test("rejects a payload without a PromptPay template", () => {
    expect(() =>
      parsePromptPayPayload(withCRC("0002010102115802TH5303764")),
    ).toThrow("exactly one PromptPay merchant account template");
  });

  test("rejects a non-THB currency", () => {
    const generated = generatePromptPayPayload({
      identifier: { type: "mobile", value: "0801234567" },
    });
    const body = generated.slice(0, -8).replace("5303764", "5303840");
    expect(() => parsePromptPayPayload(withCRC(body))).toThrow(
      "currency must be THB",
    );
  });

  test("rejects a non-Thai domestic country code", () => {
    const generated = generatePromptPayPayload({
      identifier: { type: "mobile", value: "0801234567" },
    });
    const body = generated.slice(0, -8).replace("5802TH", "5802US");
    expect(() => parsePromptPayPayload(withCRC(body))).toThrow(
      "country code must be TH",
    );
  });
});

describe("crc16", () => {
  test("matches the CRC-16/CCITT-FALSE check value", () => {
    expect(crc16(encoder.encode("123456789"))).toBe(0x29b1);
  });

  test("returns the initial value for empty input", () => {
    expect(crc16(new Uint8Array())).toBe(0xffff);
  });

  test("operates on raw bytes", () => {
    expect(crc16(new Uint8Array([0x00, 0xff, 0x10, 0x80]))).toBe(0xd958);
  });

  test("generates the CRC from the PromptPay example", () => {
    const withoutCrc = example.slice(0, -4);
    expect(formatCRC(crc16(encoder.encode(withoutCrc)))).toBe(
      example.slice(-4),
    );
  });
});

describe("formatCRC", () => {
  test.each([
    [0x0000, "0000"],
    [0x000a, "000A"],
    [0x0123, "0123"],
    [0xabcd, "ABCD"],
    [0xffff, "FFFF"],
  ])("formats %d as %s", (crc, expected) => {
    expect(formatCRC(crc)).toBe(expected);
  });
});

describe("verifyCRC", () => {
  test("verifies the PromptPay example", () => {
    expect(verifyCRC(example)).toBeTrue();
  });

  test("verifies generated payloads", () => {
    expect(verifyCRC(withCRC("0002010102125802TH"))).toBeTrue();
  });

  test("rejects payloads shorter than a CRC field", () => {
    expect(verifyCRC("")).toBeFalse();
    expect(verifyCRC("6304ABC")).toBeFalse();
  });

  test("rejects a missing or misplaced CRC tag", () => {
    expect(verifyCRC("0002019904FFFF")).toBeFalse();
    expect(verifyCRC(`${example}00`)).toBeFalse();
  });

  test("rejects a modified payload", () => {
    const modified = `${example.slice(0, 4)}02${example.slice(6)}`;
    expect(verifyCRC(modified)).toBeFalse();
  });

  test("rejects a modified checksum", () => {
    expect(verifyCRC(`${example.slice(0, -1)}B`)).toBeFalse();
  });

  test("requires the canonical uppercase checksum", () => {
    expect(
      verifyCRC(example.slice(0, -4) + example.slice(-4).toLowerCase()),
    ).toBe(false);
  });
});
