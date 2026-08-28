"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Kayıt", hint: "canlı şerit" },
  { href: "/watchlist", label: "Takip", hint: "seçili kanallar" },
  { href: "/alerts", label: "Alarm", hint: "eşik bildirimleri" },
  { href: "/settings", label: "Ayar", hint: "hesap" },
];

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-ink/60" onClick={onClose} />

      <div className="absolute left-0 top-0 h-full w-64 bg-ink text-paper">
        <div className="flex items-start justify-between border-b border-paper/12 px-5 py-5">
          <p className="font-label text-[14px] font-700 uppercase leading-none tracking-[0.14em]">
            Crypto
            <br />
            Sentiment
          </p>
          <button
            onClick={onClose}
            className="border border-paper/25 px-2 py-0.5 font-label text-[10px] font-600 uppercase tracking-[0.14em] hover:bg-paper hover:text-ink transition-colors"
          >
            Kapat
          </button>
        </div>

        <nav className="py-2">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex flex-col gap-0.5 px-5 py-3 transition-colors",
                  isActive ? "bg-paper text-ink" : "text-paper/70 hover:bg-paper/8"
                )}
              >
                <span
                  className={cn(
                    "absolute left-0 top-0 h-full w-[3px]",
                    isActive ? "bg-trace" : "bg-transparent"
                  )}
                />
                <span className="font-label text-[13px] font-600 uppercase tracking-[0.1em]">
                  {item.label}
                </span>
                <span
                  className={cn(
                    "font-data text-[10px]",
                    isActive ? "text-ink-soft" : "text-paper/35"
                  )}
                >
                  {item.hint}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
