import type { Metadata } from "next";
import { Anuphan, Geist_Mono } from "next/font/google";
import "./globals.css";
import Image from "next/image";
import { Toaster } from "sonner";
import Background from "#/bg.jpg";

const anuphan = Anuphan({
  variable: "--font-anuphan",
  subsets: ["latin", "thai"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://buzz.gunshiz.top"),
  title: "เกนชินไม่ใช่เกมมือถือ",
  description: "ระบบอีเวนท์ของเกนชินไม่ใช่เกมมือถือ",
  icons: "https://buzz.gunshiz.top/favicon.webp",
  openGraph: {
    title: "เกนชินไม่ใช่เกมมือถือ",
    description: "ระบบอีเวนท์ของเกนชินไม่ใช่เกมมือถือ",
    url: "https://buzz.gunshiz.top",
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
    <html lang="en" className="h-full">
      <body
        className={`${anuphan.variable} ${geistMono.variable} font-sans antialiased dark  h-full`}
      >
        <Image
          src={Background}
          alt="Background"
          fill
          className="z-[-1] opacity-20 object-cover"
        />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
