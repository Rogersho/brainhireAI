import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const bodyFont = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const headingFont = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Brainhire AI | Hire 10x Faster",
  description: "AI-driven talent acquisition and automated screening to help you hire faster with better accuracy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${bodyFont.variable} ${headingFont.variable}`}>
      <body className="min-h-screen bg-background font-body antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
