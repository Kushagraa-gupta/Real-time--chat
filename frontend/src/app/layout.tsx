import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "../components/Providers";
import { SocketProvider } from "../socket/SocketProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chatify | Premium Real-Time Chat Experience",
  description: "A secure, fast, and feature-rich real-time messaging application.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full dark">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col antialiased bg-gray-950 text-gray-100`}>
        <Providers>
          <SocketProvider>
            {children}
          </SocketProvider>
        </Providers>
      </body>
    </html>
  );
}
