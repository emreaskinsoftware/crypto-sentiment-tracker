import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { AlertToastProvider } from "@/components/ui/AlertToastProvider";

export const metadata: Metadata = {
  title: "Crypto Sentiment Tracker",
  description: "Real-time cryptocurrency sentiment analysis dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-display antialiased">
        {/* Ambient background orbs */}
        <div className="bg-orb bg-orb-1" aria-hidden="true" />
        <div className="bg-orb bg-orb-2" aria-hidden="true" />

        <div className="relative flex h-screen overflow-hidden bg-bg-light">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              {children}
            </main>
          </div>
        </div>
        <AlertToastProvider />
      </body>
    </html>
  );
}
