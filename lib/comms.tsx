"use client";

import { createContext, useState } from "react";

type WebsiteComms = Partial<{ manual: boolean }>;

type WebsiteCommsMutator = {
  get<K extends keyof WebsiteComms>(key: K): WebsiteComms[K];
  set<K extends keyof WebsiteComms>(key: K, value: WebsiteComms[K]): void;
};

export const CommsContext = createContext<WebsiteCommsMutator>({
  get: () => undefined,
  set: () => undefined,
});

export default function CommsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [store, setStore] = useState<WebsiteComms>({});
  return (
    <CommsContext
      value={{
        get: (k) => store[k],
        set: (k, v) => setStore((x) => ({ ...x, [k]: v })),
      }}
    >
      {children}
    </CommsContext>
  );
}
