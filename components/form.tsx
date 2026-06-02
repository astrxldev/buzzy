"use client";

import * as React from "react";
import { toast } from "sonner";
import type {
  TypedFormData,
  TypedFormDataShape,
} from "@/app/(ui)/rubgram/type";
import { cn } from "@/lib/utils";
import { DialogClose } from "./ui/dialog";
import { Label } from "./ui/label";
import { Divide } from "lucide-react";

const AUTOSAVE_TTL_MS = 10 * 60 * 1000;
const STORAGE_PREFIX = "form:autosave:";

type FormValues = Record<string, unknown>;

type FormContextValue = {
  id: string;
  values: FormValues;
  loading: boolean;
  setValue: (name: string, value: unknown) => void;
  updateValues: (updater: (prev: FormValues) => FormValues) => void;
  clear: () => void;
  submit: () => Promise<void>;
  closeDialog: () => void;
};

const FormContext = React.createContext<FormContextValue | null>(null);

export function useFormContext() {
  const ctx = React.useContext(FormContext);
  if (!ctx) throw new Error("FormInput/FormAction must be inside FormProvider");
  return ctx;
}

function storageKey(id: string) {
  return `${STORAGE_PREFIX}${id}`;
}

function safeParseAutosave(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value) as { savedAt: number; values: FormValues };
  } catch {
    return null;
  }
}

function pruneAutosaveValues(values: FormValues) {
  const pruned: FormValues = {};
  for (const [key, value] of Object.entries(values)) {
    if (value == null) continue;
    if (value instanceof Blob) continue;
    if (Array.isArray(value)) {
      const items = value.filter(
        (item) =>
          typeof item === "string" ||
          typeof item === "number" ||
          typeof item === "boolean",
      );
      if (items.length) pruned[key] = items;
      continue;
    }
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      pruned[key] = value;
    }
  }
  return pruned;
}

function appendFormValue(form: FormData, key: string, value: unknown) {
  if (value == null) return;
  if (Array.isArray(value)) {
    for (const item of value) appendFormValue(form, key, item);
    return;
  }
  if (value instanceof Blob) {
    form.append(key, value);
    return;
  }
  form.append(key, typeof value === "string" ? value : String(value));
}

function toTypedFormData<T extends TypedFormDataShape>(
  formData: FormData,
): TypedFormData<T> {
  const base = formData as unknown as TypedFormData<T>;
  if (!("raw" in base)) {
    Object.defineProperty(base, "raw", {
      value: formData,
      enumerable: false,
    });
  }
  return base;
}

function getInputValue(eventOrValue: unknown) {
  const event = eventOrValue as React.ChangeEvent<HTMLInputElement>;
  const target = event?.target as
    | (HTMLInputElement & { files?: FileList | null })
    | undefined;
  if (target) {
    if (target.type === "checkbox") return target.checked;
    if (target.files)
      return target.multiple
        ? Array.from(target.files)
        : target.files[0] || null;
    if (target instanceof HTMLSelectElement && target.multiple)
      return Array.from(target.selectedOptions).map((opt) => opt.value);
    return target.value;
  }
  return eventOrValue;
}

type SubmitFnResult =
  | {
      toast?: string;
      close?: boolean;
      error?: string;
    }
  | undefined;

type FormProviderProps<T extends TypedFormDataShape> = Omit<
  React.ComponentProps<"form">,
  "id" | "onSubmit"
> & {
  // Unique Autosave Key
  id: string;
  onSubmit?: (
    form: TypedFormData<T>,
  ) => SubmitFnResult | Promise<SubmitFnResult>;
  values?: FormValues;
};

export function FormProvider<T extends TypedFormDataShape>({
  id,
  onSubmit,
  className,
  children,
  values: defaultValues = {},
  ...props
}: FormProviderProps<T>) {
  const [values, setValues] = React.useState<FormValues>(defaultValues);
  const [loading, setLoading] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const [storageLock, setStorageLock] = React.useState<"r" | "w" | null>("r");
  const closerRef = React.useRef<HTMLButtonElement | null>(null);

  React.useEffect(() => {
    const stored = safeParseAutosave(localStorage.getItem(storageKey(id)));
    if (!stored) {
      setStorageLock(null);
      return;
    }
    if (Date.now() - stored.savedAt > AUTOSAVE_TTL_MS) {
      localStorage.removeItem(storageKey(id));
      setStorageLock(null);
      return;
    }
    setValues(stored.values || {});
    setStorageLock(null);
  }, [id]);

  React.useEffect(() => {
    if (storageLock === "r") return;
    setStorageLock("w");
    const pruned = pruneAutosaveValues(values);
    localStorage.setItem(
      storageKey(id),
      JSON.stringify({ savedAt: Date.now(), values: pruned }),
    );
    setStorageLock(null);
  }, [id, values, storageLock]);

  const setValue = React.useCallback((name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  }, []);
  const updateValues = React.useCallback(
    (updater: (prev: FormValues) => FormValues) => {
      setValues((prev) => updater(prev));
    },
    [],
  );

  const clear = React.useCallback(() => {
    setValues({});
    localStorage.removeItem(storageKey(id));
    formRef.current?.reset();
  }, [id]);

  const closeDialog = React.useCallback(() => {
    closerRef.current?.click();
  }, []);

  const submit = React.useCallback(async () => {
    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) {
      appendFormValue(formData, key, value);
    }
    setLoading(true);
    try {
      const res = await onSubmit?.(toTypedFormData(formData));
      if (res && typeof res === "object") {
        if ("error" in res) {
          const { error } = res;
          if (typeof error === "string") throw new Error(error);
        }
        if ("toast" in res) {
          const { toast: toastMsg } = res;
          if (typeof toastMsg === "string") toast(toastMsg);
        }
        if ("close" in res) {
          const { close } = res;
          if (typeof close === "boolean") {
            if (close) closerRef.current?.click();
          }
        }
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Something went wrong";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [onSubmit, values]);

  const contextValue = React.useMemo<FormContextValue>(
    () => ({
      id,
      values,
      loading,
      setValue,
      updateValues,
      clear,
      submit,
      closeDialog,
    }),
    [id, values, loading, setValue, updateValues, clear, submit, closeDialog],
  );

  return (
    <FormContext.Provider value={contextValue}>
      <form
        ref={formRef}
        id={id}
        {...props}
        className={cn("grid gap-4 [&>label]:-mb-2", className)}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {children}
      </form>
      <DialogClose ref={closerRef} />
    </FormContext.Provider>
  );
}

type FormInputProps = {
  name: string;
  // biome-ignore lint/suspicious/noExplicitAny: typescript too strict :<
  override?: (original: any) => Partial<FormValues> | void;
  label?: string;
  subLabel?: string;
  children: React.ReactElement;
  className?: string;
};

export function FormInput({
  name,
  override,
  children,
  label,
  subLabel,
  className,
}: FormInputProps) {
  const { values, setValue, updateValues } = useFormContext();
  const childProps = (children.props ?? {}) as Record<string, unknown>;
  const value = values[name] ?? childProps?.defaultValue ?? "";
  const nextProps: Record<string, unknown> = { name, defaultValue: undefined };
  const applyValue = React.useCallback(
    (nextValue: unknown) => {
      if (!override) {
        setValue(name, nextValue);
        return;
      }
      updateValues((prev) => {
        const nextValues = { ...prev, [name]: nextValue };
        const overrides = override(nextValues);
        if (!overrides || typeof overrides !== "object") return nextValues;
        return { ...nextValues, ...overrides };
      });
    },
    [name, override, setValue, updateValues],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: must run only on initial render
  React.useEffect(() => {
    if (childProps.defaultValue !== undefined)
      applyValue(childProps.defaultValue);
  }, []);

  nextProps.onCheckedChange = (checked: boolean) => {
    applyValue(checked);
    (childProps.onCheckedChange as ((value: boolean) => void) | undefined)?.(
      checked,
    );
  };
  nextProps.onValueChange = (nextValue: unknown) => {
    applyValue(nextValue);
    (childProps.onValueChange as ((value: unknown) => void) | undefined)?.(
      nextValue,
    );
  };
  nextProps.onChange = (event: unknown) => {
    const nextValue = getInputValue(event);
    applyValue(nextValue);
    (childProps.onChange as ((value: unknown) => void) | undefined)?.(event);
  };
  if (value !== undefined) {
    if (typeof value === "boolean") nextProps.checked = value;
    else {
      nextProps.value = value;
      nextProps.checked = Boolean(value);
    }
  }

  if (label) {
    nextProps.id = `forminput-${name}`;
  }

  if (children.$$typeof === Symbol.for("react.lazy")) {
    children = React.use((children as any)._payload);
  }

  return (
    <>
      {label ? (
        <div className={cn("flex flex-col gap-2 grow", className)}>
          <Label htmlFor={`forminput-${name}`}>
            {label}{" "}
            {subLabel && (
              <span className="font-normal opacity-70">{subLabel}</span>
            )}
          </Label>
          {React.cloneElement(children || Divide, nextProps)}
        </div>
      ) : (
        React.cloneElement(children || Divide, nextProps)
      )}
    </>
  );
}

type FormActionProps = Omit<
  React.ComponentProps<"button">,
  "type" | "children"
> & {
  type: "clear" | "submit" | "action";

  action?: () => SubmitFnResult | Promise<SubmitFnResult>;
  children?: React.ReactNode;
  loading?: React.ReactNode;
  asChild?: boolean;
};

export function FormAction({
  type,
  children,
  asChild,
  action,
  loading: loadingComponent,
  ...props
}: FormActionProps) {
  const { loading: formLoading, clear, closeDialog } = useFormContext();
  const [actionLoading, setActionLoading] = React.useState(false);
  const loading = formLoading || actionLoading;

  const buttonProps = {
    ...props,
    type: (type === "submit" ? "submit" : "button") as "submit" | "button",
    disabled: type !== "clear" && loading,
    onClick: async (event: React.MouseEvent<HTMLButtonElement>) => {
      props.onClick?.(event);
      if (!event.defaultPrevented && type === "action") {
        setActionLoading(true);
        try {
          const res = await action?.();
          if (res && typeof res === "object") {
            if ("error" in res) {
              const { error } = res;
              if (typeof error === "string") throw new Error(error);
            }
            if ("toast" in res) {
              const { toast: toastMsg } = res;
              if (typeof toastMsg === "string") toast(toastMsg);
            }
            if ("close" in res) {
              const { close } = res;
              if (typeof close === "boolean") {
                if (close) closeDialog();
              }
            }
          }
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : typeof error === "string"
                ? error
                : "Something went wrong";
          toast.error(message);
        } finally {
          setActionLoading(false);
        }
      }
      if (!event.defaultPrevented && type === "clear") clear();
    },
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(
      children as React.ReactElement<unknown>,
      buttonProps,
    );
  }

  return (
    <button {...buttonProps}>
      {loadingComponent && loading ? loadingComponent : children}
    </button>
  );
}

export function FormRow({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex gap-2 flex-wrap items-end", className)}
      {...props}
    />
  );
}
