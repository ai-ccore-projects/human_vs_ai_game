import type { Metadata } from "next";
import { Orbitron, Share_Tech_Mono } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { SoundProvider } from "@/hooks/useSoundManager";

import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const shareTechMono = Share_Tech_Mono({
  variable: "--font-share-tech-mono",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "AI vs Human - Arcade Game",
  description: "AAA Quality Arcade Game - Can you tell AI from Human?",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={GeistSans.className}>
      <body>
        <SoundProvider>
          {children}
        </SoundProvider>
      </body>
    </html>
  );
}
