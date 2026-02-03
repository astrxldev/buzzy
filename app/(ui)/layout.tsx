import Image from "next/image";
import { ViewTransition } from "react";
import { Toaster } from "sonner";
import Background from "#/bg.jpg";
import { SentryDevToolbar } from "@/components/sentry";
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
        className="z-[-1] opacity-20 object-cover fixed top-0 left-0 w-full h-full min-h-dvh"
      />
      <Providers>
        <ViewTransition name="fade">{children}</ViewTransition>
        <VersionCheck />
        <SentryDevToolbar />
        <Navbar />
      </Providers>
      <Toaster theme="dark" richColors closeButton />
    </>
  );
}
