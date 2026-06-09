import { ViewTransition } from "react";
import { Toaster } from "sonner";
import Background from "#/bg.webp";
import Image from "@/components/image";
import { StarsRenderer } from "@/components/stars";
import Providers, { VersionCheck } from "../client";
import { Navbar } from "./navbar";

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
        className="fixed top-0 left-0 z-[-1] h-fit min-h-dvh w-full object-cover opacity-40"
      />
      <StarsRenderer />
      <Providers>
        <ViewTransition>{children}</ViewTransition>
        <VersionCheck />
        <Navbar />
      </Providers>
      <Toaster theme="dark" richColors closeButton />
    </>
  );
}
