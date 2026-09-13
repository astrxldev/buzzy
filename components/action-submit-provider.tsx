"use client";

import { createContext } from "react";

export type ActionSubmitContextData = {
  listenForComplete: (complete: () => void) => void;
};

export const ActionSubmitContext = createContext<ActionSubmitContextData>({
  listenForComplete: (r) => {
    r();
  },
});
