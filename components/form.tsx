// oxlint-disable react-hooks/exhaustive-deps
"use client";

import * as React from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DialogClose } from "./ui/dialog";
import { Label } from "./ui/label";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Divide } from "lucide-react";
import type { FormSubmitResult } from "./form-submit";

const AUTOSAVE_TTL_MS = 10 * 60 * 1000;
const STORAGE_PREFIX = "form:autosave:";

type FormValues = Record<string, unknown>;

type FormContextValue = {
  id: string;
  values: FormValues;
  errors: Record<string, string>;
  loading: boolean;
  setValue: (name: string, value: unknown) => void;
  updateValues: (updater: (prev: FormValues) => FormValues) => void;
  clear: () => void;
  submit: () => Promise<void>;
  closeDialog: () => void;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
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

type FormProviderProps = Omit<
  React.ComponentProps<"form">,
  "id" | "onSubmit"
> & {
  // Unique Autosave Key
  id: string;
  onSubmit?: (form: FormData) => FormSubmitResult | Promise<FormSubmitResult>;
  values?: FormValues;
  inDialog?: boolean;
};

export function FormProvider({
  id,
  onSubmit,
  className,
  children,
  inDialog = true,
  values: defaultValues = {},
  ...props
}: FormProviderProps) {
  const [values, setValues] = React.useState<FormValues>(defaultValues);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
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
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);
  const updateValues = React.useCallback(
    (updater: (prev: FormValues) => FormValues) => {
      setValues((prev) => updater(prev));
    },
    [],
  );

  const clear = React.useCallback(() => {
    setValues({});
    setErrors({});
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
    setErrors({});
    try {
      const res = await onSubmit?.(formData);
      if (res && typeof res === "object") {
        if ("error" in res) {
          const { error } = res;
          if (typeof error === "string") {
            toast.error(error);
          } else if (Array.isArray(error)) {
            const fieldErrors: Record<string, string> = {};
            for (const e of error) {
              fieldErrors[e.where] = e.what;
            }
            setErrors(fieldErrors);
          } else if (error) {
            setErrors({ [error.where]: error.what });
          }
        } else {
          setErrors({});
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
        if ("reset" in res) {
          const { reset } = res;
          if (reset) clear();
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
  }, [onSubmit, values, clear]);

  const contextValue = React.useMemo<FormContextValue>(
    () => ({
      id,
      values,
      errors,
      loading,
      setValue,
      updateValues,
      clear,
      submit,
      closeDialog,
      setErrors,
    }),
    [
      id,
      values,
      errors,
      loading,
      setValue,
      updateValues,
      clear,
      submit,
      closeDialog,
      setErrors,
    ],
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
      {inDialog && <DialogClose ref={closerRef} />}
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
  const { values, setValue, updateValues, errors } = useFormContext();
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
        <div className={cn("flex grow flex-col gap-2", className)}>
          <Label htmlFor={`forminput-${name}`}>
            {label}{" "}
            {subLabel && (
              <span className="font-normal opacity-70">{subLabel}</span>
            )}
          </Label>
          {React.cloneElement(children || Divide, nextProps)}
          {errors[name] && (
            <span className="text-sm text-destructive">{errors[name]}</span>
          )}
        </div>
      ) : (
        <div className={cn(className)}>
          {React.cloneElement(children || Divide, nextProps)}
          {errors[name] && (
            <span className="text-sm text-destructive">{errors[name]}</span>
          )}
        </div>
      )}
    </>
  );
}

type FormActionProps = Omit<
  React.ComponentProps<"button">,
  "type" | "children"
> & {
  type: "clear" | "submit" | "action";

  action?: () => FormSubmitResult | Promise<FormSubmitResult>;
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
  const {
    loading: formLoading,
    clear,
    closeDialog,
    setErrors,
  } = useFormContext();
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
              if (typeof error === "string") {
                toast.error(error);
              } else if (Array.isArray(error)) {
                const fieldErrors: Record<string, string> = {};
                for (const e of error) {
                  fieldErrors[e.where] = e.what;
                }
                setErrors(fieldErrors);
              } else if (error) {
                setErrors({ [error.where]: error.what });
              }
            } else {
              setErrors({});
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
            if ("reset" in res) {
              const { reset } = res;
              if (reset) clear();
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
      className={cn("flex flex-wrap items-end gap-2", className)}
      {...props}
    />
  );
}

export function FormTab({
  label,
  name,
  tabs,
  children,
}: {
  label?: React.ReactNode;
  name: string;
  tabs: { label: React.ReactNode; value: string }[];
  children: React.ReactNode;
}) {
  const { values, setValue } = useFormContext();
  const active = (values[name] as string | undefined) ?? tabs[0]?.value;

  React.useEffect(() => {
    if (values[name] === undefined && tabs[0]) {
      setValue(name, tabs[0].value);
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: only run on mount to seed default
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex w-full items-end justify-between">
        {label}
        <Tabs value={active} onValueChange={(v) => setValue(name, v)}>
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <div className="rounded-md bg-muted-foreground/10 p-3">
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return null;
          const childValue = (child.props as Record<string, unknown>).value;
          return childValue === active ? child : null;
        })}
      </div>
    </div>
  );
}

export function FormChoice({
  children,
}: {
  // biome-ignore lint/style/useExportType: not a type
  value: string;
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

export function FormIf({
  children,
  ...conditions
}: {
  children: React.ReactNode;
} & Record<string, unknown>) {
  const { values } = useFormContext();
  const match = Object.entries(conditions).every(
    ([name, equals]) => values[name] === equals,
  );

  return <div className={cn(!match && "hidden")}>{children}</div>;
}

export function FormWrapper({
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div {...props}>
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child, props as Record<string, unknown>)
          : child,
      )}
    </div>
  );
}
