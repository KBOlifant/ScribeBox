import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono, Instrument_Sans, Source_Serif_4 } from "next/font/google";
import { AuthProvider } from "@/components/auth-provider";
import { MotionProvider } from "@/components/motion";
import "./globals.css";

const sans = Instrument_Sans({ variable: "--font-instrument-sans", subsets: ["latin"] });
const serif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});
const mono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: "ScribeBox", template: "%s · ScribeBox" },
  description: "Turn meeting transcripts into a summary, decisions and action items you can track.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={[sans.variable, serif.variable, mono.variable].join(" ")}>
      <body className="min-h-dvh font-sans">
        <MotionProvider>
          <AuthProvider>{children}</AuthProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
