import { AnimatePresence } from "framer-motion";
import { Toaster } from "sonner";
import Background from "#/bg.jpg";
import Image from "@/components/image";
import { SentryDevToolbar } from "@/components/sentry";
import Providers, { VersionCheck } from "../client";

export default async function UiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        <SentryDevToolbar />
      </Providers>
      <Toaster theme="dark" richColors closeButton />
    </>
  );
}
