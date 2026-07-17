import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const sans = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "MovieRanker",
    template: "%s · MovieRanker",
  },
  description:
    "Rank your all-time. Share the order. Battle when you’re stuck. Import Letterboxd.",
  openGraph: {
    title: "MovieRanker",
    description: "Rank your all-time. Share the order.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} h-full`}>
      <body className="min-h-full antialiased">
        <div className="film-root">{children}</div>
      </body>
    </html>
  );
}
