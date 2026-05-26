import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { APP_NAME, BRAND_LINE } from "@/lib/config";
import "./globals.css";

// Build spec Section 8.2: Fraunces for display, Inter for UI. SemiBold is
// the wordmark/heading weight. We bring in display + 600 only for Fraunces
// to keep the served font bytes down.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${APP_NAME} — ${BRAND_LINE}`,
  description: BRAND_LINE,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4EDDF" },
    { media: "(prefers-color-scheme: dark)", color: "#1B1712" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="bg-encore text-encore font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
