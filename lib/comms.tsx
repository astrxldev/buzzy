"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type WebsiteComms = Partial<{
  manual: boolean;
  debug: boolean;
  connected: boolean;
  updated: boolean;
  _raw: Record<string, unknown>;
}>;

type WebsiteSignals = { beforeSubmit?: undefined } & WebsiteComms;

type WebsiteCommsMutator = {
  get<K extends keyof WebsiteComms>(key: K): WebsiteComms[K];
  set<K extends keyof WebsiteComms>(key: K, value: WebsiteComms[K]): void;
  on<K extends keyof WebsiteSignals>(
    key: K,
    listener: (value: WebsiteSignals[K]) => void,
  ): () => void;
  off<K extends keyof WebsiteSignals>(
    key: K,
    listener: (value: WebsiteSignals[K]) => void,
  ): void;
  emit<K extends keyof WebsiteSignals>(key: K, value: WebsiteSignals[K]): void;
  active: boolean;
};

export const CommsContext = createContext<WebsiteCommsMutator>({
  get: () => {
    console.error("Inter-component communication used outside of provider.");
    return undefined;
  },
  set: () => undefined,
  on: () => () => undefined,
  off: () => undefined,
  emit: () => undefined,
  active: false,
});

export default function CommsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeRef = useRef<WebsiteComms>({});
  const [, forceUpdate] = useState({});

  const listeners = useRef<{
    [K in keyof WebsiteSignals]?: Array<(value: WebsiteSignals[K]) => void>;
  }>({});

  const set: WebsiteCommsMutator["set"] = (k, v) => {
    storeRef.current = { ...storeRef.current, [k]: v };
    if (k !== "_raw") {
      console.log(`SET ${k} = ${v}`);
      const { _raw, ...withoutRaw } = storeRef.current;
      set("_raw", withoutRaw);
    }
    (listeners.current[k] || []).map((l) => l(v));
    forceUpdate({});
  };

  const contextValue = useRef<WebsiteCommsMutator>({
    get: (k) => storeRef.current[k],
    set,
    on: (k, listener) => {
      // @ts-expect-error
      listeners.current[k] = [...(listeners.current[k] || []), listener];
      return () => {
        // @ts-expect-error
        listeners.current[k] = listeners.current[k]?.filter(
          (l) => l !== listener,
        );
      };
    },
    off: (k, listener) => {
      // @ts-expect-error
      listeners.current[k] = (listeners.current[k] || []).filter(
        (l) => l !== listener,
      );
    },
    emit: (k, value) => {
      (listeners.current[k] || []).map((l) => l(value));
    },
    active: true,
  });

  return <CommsContext value={contextValue.current}>{children}</CommsContext>;
}

export const comms = {
  var(name: keyof WebsiteComms) {
    const comms = use(CommsContext);
    if (!comms.active) {
      console.warn(
        "Inter-component communication used outside of provider. Using local state instead.",
      );
    }
    const [state, setState] = useState(
      comms.active ? comms.get(name) : undefined,
    );
    useEffect(() => {
      function listener(value: WebsiteComms[typeof name]) {
        setState(value);
      }
      return comms.on(name, listener);
    }, [name]);

    const mutator = useCallback(
      (
        value:
          | WebsiteComms[typeof name]
          | ((prev: WebsiteComms[typeof name]) => WebsiteComms[typeof name]),
      ) => {
        const v = typeof value === "function" ? value(comms.get(name)) : value;
        if (comms.active) comms.set(name, v);
        else setState(v);
      },
      [name],
    );

    return [state, mutator] as const;
  },
  event<K extends keyof WebsiteSignals>(
    key: K,
    listener: (ev: WebsiteSignals[K]) => void,
  ) {
    const comms = use(CommsContext);
    if (!comms.active) {
      console.warn(
        "Inter-component communication used outside of provider. No events will be emitted.",
      );
    }
    useEffect(() => {
      return comms.on(key, listener);
    }, [comms, key, listener]);
  },
  raw() {
    return [comms.var("_raw")[0]];
  },
};
