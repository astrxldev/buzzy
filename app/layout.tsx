import type { Metadata } from "next";
import { Anuphan, Geist_Mono } from "next/font/google";
import "./globals.css";
import Image from "next/image";
import { Toaster } from "sonner";
import Background from "#/bg.jpg";
import Providers from "./provider";

const anuphan = Anuphan({
  variable: "--font-anuphan",
  subsets: ["latin", "thai"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.BASE_URL || "https://buzz.gunshiz.top"),
  title: "เกนชินไม่ใช่เกมมือถือ",
  description: "ระบบอีเวนท์ของเกนชินไม่ใช่เกมมือถือ",
  icons: `/favicon.webp`, // TODO: CHANGE BACK TO buzz
  openGraph: {
    title: "เกนชินไม่ใช่เกมมือถือ",
    description: "ระบบอีเวนท์ของเกนชินไม่ใช่เกมมือถือ",
    url: `/`,
    siteName: "เกนชินไม่ใช่เกมมือถือ",
    locale: "th_TH",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full dark">
      <body
        className={`${anuphan.variable} ${geistMono.variable} font-sans antialiased h-full`}
      >
        <Image
          src={Background}
          alt="Background"
          className="z-[-1] opacity-20 object-cover fixed top-0 left-0 w-full h-full"
        />
        <Providers>{children}</Providers>
        <Toaster theme="dark" richColors closeButton />
      </body>
    </html>
  );
}
