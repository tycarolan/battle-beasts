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

// TEMPLATE: replace every string below, and the subdomain, with this app's own.
// `metadataBase` and the Open Graph block are what make a shared link unfurl as
// this app rather than as a bare URL.
export const metadata: Metadata = {
  title: "App Template",
  description:
    "Two sentences, written for someone who has never seen this project: what it is, then how it runs.",
  applicationName: "App Template",
  metadataBase: new URL("https://app-template.taiotech.com"),
  openGraph: {
    title: "App Template",
    description: "What it is, in one line.",
    url: "https://app-template.taiotech.com",
    siteName: "App Template",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // `maximumScale`/`userScalable` disable pinch zoom, which is the right call
  // only when controls sit at the screen edge where a zoomed page would hide
  // them — both games need it. Delete both lines for anything text-first,
  // where suppressing zoom is an accessibility regression for no benefit.
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
