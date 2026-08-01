import type { Metadata, Viewport } from "next";
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
  title: "Battle Beasts",
  description:
    "A real-time lane battler: twelve animal units, three towers a side, and a hand of four cards paid for out of regenerating elixir. Runs in a phone browser with nothing to install.",
  applicationName: "Battle Beasts",
  metadataBase: new URL("https://battlebeasts.taiotech.com"),
  openGraph: {
    title: "Battle Beasts",
    description: "Spend elixir, drop beasts, take down three towers.",
    url: "https://battlebeasts.taiotech.com",
    siteName: "Battle Beasts",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // The card hand sits on the bottom edge and the arena fills everything above
  // it, so a zoomed page hides the only controls there are. Kept for that
  // reason; there is no text here a player needs to enlarge to read.
  maximumScale: 1,
  userScalable: false,
  themeColor: "#09090b",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
