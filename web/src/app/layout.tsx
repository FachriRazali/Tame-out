import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { THEME_INIT_SCRIPT } from "@/components/ui/ThemeToggle";

// Inter is self-hosted (variable font, Latin subset) instead of loaded from
// Google Fonts: no extra DNS/TLS round trip and no render-blocking stylesheet.
// next/font preloads it and generates a size-matched fallback so text doesn't jump.
const inter = localFont({
  src: "./fonts/InterVariable-latin.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Tame'out — Live Capacity & Seat Reservation",
  description: "Find a cafe with real seats available, right now.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Runs before hydration so the correct theme applies with no flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
