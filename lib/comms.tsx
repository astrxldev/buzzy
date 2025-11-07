"use client";

import { createContext, use, useEffect, useRef, useState } from "react";

type WebsiteComms = Partial<{ manual: boolean }>;

type WebsiteSignals = { beforeSubmit: undefined } & WebsiteComms;

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
};

export const CommsContext = createContext<WebsiteCommsMutator>({
  get: () => undefined,
  set: () => undefined,
  on: () => () => undefined,
  off: () => undefined,
  emit: () => undefined,
});

export default function CommsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [store, setStore] = useState<WebsiteComms>({});
  const listeners = useRef<{
    [K in keyof WebsiteSignals]?: Array<(value: WebsiteSignals[K]) => void>;
  }>({});
  return (
    <CommsContext
      value={{
        get: (k) => store[k],
        set: (k, v) => {
          setStore((x) => ({ ...x, [k]: v }));
          (listeners.current[k] || []).map((l) => l(v));
        },
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
      }}
    >
      {children}
    </CommsContext>
  );
}

export const comms = {
  var(name: keyof WebsiteComms) {
    const comms = use(CommsContext);
    const [state, setState] = useState(comms.get(name));
    useEffect(() => {
      function listener(value: WebsiteComms[typeof name]) {
        setState(value);
      }
      return comms.on(name, listener);
    }, [comms, name]);

    return [state, comms.set.bind(comms, name)] as const;
  },
  event<K extends keyof WebsiteSignals>(
    key: K,
    listener: (ev: WebsiteSignals[K]) => void,
  ) {
    const comms = use(CommsContext);
    useEffect(() => {
      return comms.on(key, listener);
    }, [comms, key, listener]);
  },
};
