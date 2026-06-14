import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";
import MarketTicker from "./components/MarketTicker";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "리서치 에이전트 | Research Agent",
  description: "AI 기반 투자 리서치 플랫폼 | AI-powered Investment Research Platform",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
return (
  <html
    lang="ko"
    className={`${geistMono.variable} h-full antialiased scroll-smooth`}
    suppressHydrationWarning
  >
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="x-ua-compatible" content="ie=edge" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📈</text></svg>" />
      </head>
      <body className="bg-dark-bg text-dark-fg antialiased overflow-x-hidden">
        <div className="flex flex-col h-screen">
          {/* Navbar */}
          <Navbar />

          {/* Market Ticker */}
          <MarketTicker />

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="w-full h-full">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
