import type { Metadata, Viewport } from "next";
import { DM_Sans, Literata } from "next/font/google";
import { CloudLibrarySync } from "@/components/CloudLibrarySync";
import { SupabaseAuthProvider } from "@/components/SupabaseAuthProvider";
import { ReadingNookProvider } from "@/lib/app-state";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "The Reading Nook",
    template: "%s · The Reading Nook",
  },
  description: "A cozy place for your reading life.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbf9f9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${literata.variable} h-full antialiased`}
    >
      <body className="min-h-dvh bg-background text-foreground">
        <ReadingNookProvider>
          <SupabaseAuthProvider>
            <CloudLibrarySync />
            {children}
          </SupabaseAuthProvider>
        </ReadingNookProvider>
      </body>
    </html>
  );
}
