import type { z } from "zod";

export type FormSubmitResult =
  | {
      toast?: string;
      close?: boolean;
      reset?: boolean;
      error?:
        | string
        | { what: string; where: string }
        | { what: string; where: string }[];
    }
  | undefined;

export function defineFormHandler<TSchema extends z.ZodType>(
  schema: TSchema,
  action: (input: z.output<TSchema>) => Promise<FormSubmitResult>,
): (form: FormData) => Promise<FormSubmitResult>;
export function defineFormHandler<
  TAction extends (form: FormData) => Promise<FormSubmitResult>,
>(action: TAction): TAction;
export function defineFormHandler(
  schemaOrAction: z.ZodType | ((form: FormData) => Promise<FormSubmitResult>),
  action?: (input: unknown) => Promise<FormSubmitResult>,
): (form: FormData) => Promise<FormSubmitResult> {
  if (!action)
    return schemaOrAction as (form: FormData) => Promise<FormSubmitResult>;
  const schema = schemaOrAction as z.ZodType;
  return async (form: FormData) => {
    // "use server";
    const raw = Object.fromEntries([...form.entries()]);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return {
        error: parsed.error.issues.map((issue) => ({
          what: issue.message,
          where: issue.path.join("."),
        })),
      };
    }
    return action(parsed.data);
  };
}

export function formParse<TSchema extends z.ZodType>(
  schema: TSchema,
  data: FormData,
): { $: z.output<TSchema>; error: { what: string; where: string }[] | string } {
  const raw = Object.fromEntries([...data.entries()]);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    if (
      parsed.error.issues.length === 1 &&
      parsed.error.issues[0].path.length === 0
    )
      return { error: parsed.error.issues[0].message, $: undefined as any };
    return {
      error: parsed.error.issues.map((issue) => ({
        what: issue.message,
        where: issue.path.join("."),
      })),
      $: undefined as any,
    };
  }
  return { $: parsed.data, error: undefined as any };
}
