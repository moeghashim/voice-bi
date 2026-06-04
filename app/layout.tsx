import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "voice-bi",
  description: "Voice-first business intelligence for micro-business owners.",
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
