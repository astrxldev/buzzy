import type { Metadata } from "next";
import { Anuphan, Geist_Mono } from "next/font/google";
import "./globals.css";

const anuphan = Anuphan({
  variable: "--font-anuphan",
  subsets: ["latin", "thai"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.BASE_URL || "https://buzz.sudloh.com"),
  title: "เกนชินไม่ใช่เกมมือถือ",
  description: "ระบบอีเวนท์ของเกนชินไม่ใช่เกมมือถือ",
  icons: `/favicon.webp`,
  openGraph: {
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
        {children}
      </body>
    </html>
  );
}
