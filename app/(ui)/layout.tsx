import { AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Toaster } from "sonner";
import Background from "#/bg.jpg";
import Providers, { VersionCheck } from "../client";

export default function UiLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Image
        src={Background}
        alt="Background"
        className="z-[-1] opacity-20 object-cover fixed top-0 left-0 w-full h-full"
      />
      <Providers>
        <AnimatePresence mode="wait">{children}</AnimatePresence>
        <VersionCheck />
      </Providers>
      <Toaster theme="dark" richColors closeButton />
    </>
  );
}
