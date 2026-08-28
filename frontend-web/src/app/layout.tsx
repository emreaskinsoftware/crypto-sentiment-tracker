import type { Metadata } from "next";
import { Archivo, Newsreader, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { AlertToastProvider } from "@/components/ui/AlertToastProvider";

// Cihaz etiketleri — versal, açık aralıklı
const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-archivo",
  display: "swap",
});

// Yalnızca haber metni: makinenin etiketi ile dünyanın sözü ayrışsın
const newsreader = Newsreader({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

// Tüm sayısal okuma
const plexMono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CryptoSentiment — kayıt cihazı",
  description:
    "Kripto haberlerinin duygusunu 15 dakikada bir kaydeden ve fiyatla karşılaştıran ölçüm aracı.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="tr"
      className={`${archivo.variable} ${newsreader.variable} ${plexMono.variable}`}
    >
      <body className="antialiased bg-paper text-ink">
        <div className="flex h-screen overflow-hidden">
          {/* Cihaz gövdesi */}
          <Sidebar />

          {/* Kağıt yolu */}
          <div className="flex flex-1 overflow-hidden">
            {/* Sürekli form kağıdın delikli kenarı */}
            <div
              className="sprocket hidden sm:block w-7 shrink-0"
              aria-hidden="true"
            />

            <div className="flex flex-1 flex-col overflow-hidden">
              <Header />
              <main className="paper-grid flex-1 overflow-y-auto scrollbar-hide">
                <div className="px-5 py-6 sm:px-8 sm:py-8">{children}</div>
              </main>
            </div>
          </div>
        </div>
        <AlertToastProvider />
      </body>
    </html>
  );
}
