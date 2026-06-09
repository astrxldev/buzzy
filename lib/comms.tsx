"use client";

declare global {
  interface Window {
    icc: IccMutator;
  }
}

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type SharedStates = Partial<{
  manual: boolean;
  debug: boolean;
  connected: boolean;
  updated: boolean;
  "rubgram.services": string[];
  "tl.deleteMode": boolean;
  inspect: Record<string, string>;
  // nf(Not Found) and showcase(Not In Showcase) is error dialog that opens guide
  warning: "showcase" | "nf" | "guide" | "private";
  "warning.uid": string;
  "warning.src": "submit" | "input";
  _raw: Record<string, unknown>;
}>;

type SharedSignals = {
  beforeSubmit?: undefined;
  sync?: undefined;
  warningSolved?: undefined;
} & SharedStates;

type IccMutator = {
  get<K extends keyof SharedStates>(key: K): SharedStates[K];
  set<K extends keyof SharedStates>(key: K, value: SharedStates[K]): void;
  on<K extends keyof SharedSignals>(
    key: K,
    listener: (value: SharedSignals[K]) => void,
  ): () => void;
  off<K extends keyof SharedSignals>(
    key: K,
    listener: (value: SharedSignals[K]) => void,
  ): void;
  emit<K extends keyof SharedSignals>(
    key: K,
    ...args: SharedSignals[K] extends undefined ? [] : [value: SharedSignals[K]]
  ): void;
  active: boolean;
};

export const IccContext = createContext<IccMutator>({
  get: () => {
    console.error("ICC used outside of provider.");
    return undefined;
  },
  set: () => undefined,
  on: () => () => undefined,
  off: () => undefined,
  emit: () => undefined,
  active: false,
});

export default function IccProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeRef = useRef<SharedStates>({});

  const listeners = useRef<{
    [K in keyof SharedSignals]?: Array<
      (
        ...args: SharedSignals[K] extends undefined
          ? []
          : [value: SharedSignals[K]]
      ) => void
    >;
  }>({});

  const contextValue = useRef<IccMutator>({
    get: (k) => storeRef.current[k],
    set(k, v) {
      storeRef.current = { ...storeRef.current, [k]: v };
      // prevent infinite recursion
      if (k !== "_raw") {
        console.log(`SET ${k} = ${v}`);
        const { _raw, ...withoutRaw } = storeRef.current;
        contextValue.current.set("_raw", withoutRaw);
      }
      contextValue.current.emit(
        ...([k, v] as unknown as Parameters<typeof contextValue.current.emit>),
      );
    },
    on(k, listener) {
      // @ts-expect-error typescript screams for some impossible static type conflict
      listeners.current[k] = [...(listeners.current[k] || []), listener];
      return () => contextValue.current.off(k, listener);
    },
    off(k, listener) {
      // @ts-expect-error typescript screams for some impossible static type conflict
      listeners.current[k] = (listeners.current[k] || []).filter(
        (l) => l !== listener,
      );
    },
    // oxlint-disable-next-line typescript/no-useless-default-assignment
    emit(k, value = undefined) {
      (listeners.current[k] || []).map((l) =>
        l(...([value] as Parameters<typeof l>)),
      );
    },
    active: true,
  });

  if (typeof window !== "undefined" && location.hostname === "localhost")
    window.icc = contextValue.current;

  return <IccContext value={contextValue.current}>{children}</IccContext>;
}

export const shared = {
  state<K extends keyof SharedStates>(
    name: K,
  ): [
    SharedStates[K],
    (
      value: SharedStates[K] | ((prev: SharedStates[K]) => SharedStates[K]),
    ) => void,
  ] {
    const comms = use(IccContext);
    if (!comms.active) {
      console.warn("ICC used outside of provider. Using local state instead.");
    }
    const [state, setState] = useState(
      comms.active ? comms.get(name) : undefined,
    );
    useEffect(() => {
      function listener(value: SharedStates[typeof name]) {
        setState(value);
      }
      return comms.on(name, listener);
    }, [comms, name]);

    const mutator = useCallback(
      (
        value:
          | SharedStates[typeof name]
          | ((prev: SharedStates[typeof name]) => SharedStates[typeof name]),
      ) => {
        const v = typeof value === "function" ? value(comms.get(name)) : value;
        if (comms.active) comms.set(name, v);
        else setState(v);
      },
      [comms, name],
    );

    return [state, mutator] as const;
  },
  signal<K extends keyof SharedSignals>(
    key: K,
    listener: (ev: SharedSignals[K]) => void,
  ) {
    const comms = use(IccContext);
    const listenerRef = useRef(listener);

    useEffect(() => {
      listenerRef.current = listener;
    }, [listener]);
    useEffect(() => {
      const stableListener = (value: SharedSignals[K]) => {
        listenerRef.current(value);
      };
      return comms.on(key, stableListener);
    }, [comms, key]);
  },
  raw() {
    return [shared.state("_raw")[0]];
  },
  inspect(k: string, v: Parameters<typeof console.log>[0]) {
    const comms = use(IccContext);
    // unmount handler
    useEffect(
      () => () => {
        const { [k]: _, ...rest } = comms.get("inspect") || {};
        comms.set("inspect", rest);
      },
      // oxlint-disable-next-line react-hooks/exhaustive-deps
      [],
    );
    // value updater
    useEffect(() => {
      const obj = comms.get("inspect") || {};
      comms.set("inspect", {
        ...obj,
        [k]: typeof v === "string" ? v : JSON.stringify(v),
      });
      // oxlint-disable-next-line react-hooks/exhaustive-deps
    }, [v]);
  },
  emit<K extends keyof SharedSignals>(
    key: K,
    ...data: SharedSignals[K] extends undefined ? [] : [SharedSignals[K]]
  ) {
    const comms = use(IccContext);

    comms.emit(key, ...data);
  },
};
