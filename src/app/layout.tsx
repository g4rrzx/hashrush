import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HashRush",
  description: "Mine crypto, earn rewards on Base.",
  openGraph: {
    title: "HashRush",
    description: "Mine crypto, earn rewards on Base.",
    images: [
      {
        url: "https://hashrush.vercel.app/image.png",
        width: 1200,
        height: 800,
        alt: "HashRush Preview",
      },
    ],
  },
  manifest: "/manifest.json",
  other: {
    "base:app_id": "bc_8io601u8",
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: "https://hashrush.vercel.app/image.png",
      button: {
        title: "Start Mining",
        action: {
          type: "launch_mini_app",
          name: "HashRush",
          url: "https://hashrush.vercel.app",
          splashImageUrl: "https://hashrush.vercel.app/splash.png",
          splashBackgroundColor: "#0f172a",
        },
      },
    }),
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
