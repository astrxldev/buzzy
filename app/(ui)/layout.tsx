import { Anuphan } from "next/font/google";
import { ViewTransition } from "react";
import { Toaster } from "sonner";
import Providers, { VersionCheck } from "../client";
import { Navbar } from "./navbar";
import { BackgroundProvider } from "./background";

const anuphan = Anuphan({
  variable: "--font-anuphan",
  subsets: ["latin", "thai"],
});

export default async function UiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BackgroundProvider />
      <Providers>
        <ViewTransition>{children}</ViewTransition>
        <VersionCheck />
        <Navbar />
      </Providers>
      <Toaster
        theme="dark"
        richColors
        closeButton
        toastOptions={{ className: anuphan.className }}
      />
    </>
  );
}
