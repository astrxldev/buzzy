import { describe, expect, mock, test } from "bun:test";
import { z } from "zod";
import { defineFormHandler, formParse } from "./form-submit";

function form(entries: Record<string, string | Blob>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

const schema = z.object({
  name: z.string().min(2, "Name is too short"),
  age: z.coerce.number().int().positive("Age must be positive"),
});

describe("defineFormHandler", () => {
  test("returns a schema-less action unchanged", async () => {
    const action = mock(async (data: FormData) => ({
      toast: String(data.get("name")),
    }));
    const handler = defineFormHandler(action);
    const data = form({ name: "Ada" });

    expect(handler).toBe(action);
    expect(await handler(data)).toEqual({ toast: "Ada" });
    expect(action).toHaveBeenCalledWith(data);
  });

  test("parses and transforms valid form data before calling the action", async () => {
    const action = mock(async (input: z.output<typeof schema>) => ({
      toast: `${input.name}:${input.age}`,
      close: true,
    }));
    const handler = defineFormHandler(schema, action);

    expect(await handler(form({ name: "Ada", age: "42" }))).toEqual({
      toast: "Ada:42",
      close: true,
    });
    expect(action).toHaveBeenCalledWith({ name: "Ada", age: 42 });
  });

  test("maps all field issues and does not call the action", async () => {
    const action = mock(async () => ({ reset: true }));
    const handler = defineFormHandler(schema, action);

    expect(await handler(form({ name: "A", age: "0" }))).toEqual({
      error: [
        { what: "Name is too short", where: "name" },
        { what: "Age must be positive", where: "age" },
      ],
    });
    expect(action).not.toHaveBeenCalled();
  });

  test("joins nested issue paths with dots", async () => {
    const nested = z.object({ "profile.email": z.email("Bad email") });
    const handler = defineFormHandler(nested, async () => undefined);

    expect(await handler(form({ "profile.email": "no" }))).toEqual({
      error: [{ what: "Bad email", where: "profile.email" }],
    });
  });

  test("uses the last value when a field occurs more than once", async () => {
    const data = form({ name: "first", age: "1" });
    data.append("name", "last");
    const handler = defineFormHandler(schema, async (input) => ({
      toast: input.name,
    }));
    expect(await handler(data)).toEqual({ toast: "last" });
  });

  test("propagates errors thrown by the action", async () => {
    const failure = new Error("action failed");
    const handler = defineFormHandler(schema, async () => {
      throw failure;
    });
    expect(handler(form({ name: "Ada", age: "42" }))).rejects.toBe(failure);
  });
});

describe("formParse", () => {
  test("returns transformed data for valid forms", () => {
    const result = formParse(schema, form({ name: "Ada", age: "42" }));
    expect(result.$).toEqual({ name: "Ada", age: 42 });
    expect(result.error).toBeUndefined();
  });

  test("returns issue descriptors for field errors", () => {
    const result = formParse(schema, form({ name: "A", age: "0" }));
    expect(result.$).toBeUndefined();
    expect(result.error).toEqual([
      { what: "Name is too short", where: "name" },
      { what: "Age must be positive", where: "age" },
    ]);
  });

  test("returns a string for a single root-level error", () => {
    const rootSchema = z
      .object({ code: z.string() })
      .refine(({ code }) => code === "valid", "Invalid form");
    const result = formParse(rootSchema, form({ code: "wrong" }));
    expect(result.$).toBeUndefined();
    expect(result.error).toBe("Invalid form");
  });

  test("keeps root errors in the issue list when there are multiple issues", () => {
    const multiple = z
      .object({ value: z.string().min(2, "Too short") })
      .refine(() => false, "Invalid form");
    const result = formParse(multiple, form({ value: "x" }));
    expect(result.$).toBeUndefined();
    expect(result.error).toEqual([
      { what: "Too short", where: "value" },
      { what: "Invalid form", where: "" },
    ]);
  });
});
