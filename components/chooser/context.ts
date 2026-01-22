import { createContext } from "react";

export type CdnFile = {
  id: string;
  name: string | null;
  size: string;
};

interface CdnChooserContextType {
  call(options?: { type?: string }): Promise<CdnFile | null>;
}

export const CdnChooserContext = createContext<CdnChooserContextType | null>(
  null,
);
