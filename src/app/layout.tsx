import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HashRush",
  description: "Mine crypto, buy upgrades, win jackpots.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
