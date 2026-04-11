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
        className="z-[-1] opacity-40 object-cover fixed top-0 left-0 w-full h-fit min-h-dvh"
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
