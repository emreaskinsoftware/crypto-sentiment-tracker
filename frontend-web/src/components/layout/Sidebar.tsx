"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { RecordingLamp } from "@/components/ui/RecordingLamp";

const navItems = [
  { href: "/", label: "Kayıt", hint: "canlı şerit" },
  { href: "/watchlist", label: "Takip", hint: "seçili kanallar" },
  { href: "/alerts", label: "Alarm", hint: "eşik bildirimleri" },
  { href: "/settings", label: "Ayar", hint: "hesap" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col bg-ink text-paper">
      {/* Künye — cihazın üzerindeki serigrafi */}
      <div className="px-5 pt-6 pb-5 border-b border-paper/12">
        <p className="font-label text-[15px] font-700 uppercase tracking-[0.14em] leading-none">
          Crypto
          <br />
          Sentiment
        </p>
        <p className="font-data text-[10px] text-paper/45 mt-2.5 tracking-wide">
          FinBERT · 15dk çevrim
        </p>
      </div>

      {/* Kanal seçimi */}
      <nav className="flex-1 py-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative flex flex-col gap-0.5 px-5 py-2.5 transition-colors duration-150",
                isActive ? "bg-paper text-ink" : "text-paper/70 hover:bg-paper/8 hover:text-paper"
              )}
            >
              {/* Seçili kanalın kalem işareti */}
              <span
                className={cn(
                  "absolute left-0 top-0 h-full w-[3px] transition-colors",
                  isActive ? "bg-trace" : "bg-transparent"
                )}
              />
              <span className="font-label text-[13px] font-600 uppercase tracking-[0.1em]">
                {item.label}
              </span>
              <span
                className={cn(
                  "font-data text-[10px] transition-colors",
                  isActive ? "text-ink-soft" : "text-paper/35"
                )}
              >
                {item.hint}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Kayıt durumu — sahte veri yok, cihazın gerçek hâli */}
      <div className="px-5 py-5 border-t border-paper/12">
        <RecordingLamp />
      </div>
    </aside>
  );
}
