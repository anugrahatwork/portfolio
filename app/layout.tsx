import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Portfolio App",
  description: "A personal portfolio website built with Next.js and TypeScript.",
  metadataBase: new URL("https://www.anugrahatwork.com"),
  openGraph: {
    images: ["/profile.png"]
  },
  twitter: {
    images: ["/profile.png"]
  }
};

import { Terminal } from "./components/Terminal";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/profile.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Terminal />
        {children}
      </body>
    </html>
  );
}
