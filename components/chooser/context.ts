import { createContext } from "react";

interface CdnChooserContextType {
  call(options?: { type?: string }): Promise<string | null>;
}

export const CdnChooserContext = createContext<CdnChooserContextType | null>(
  null,
);
