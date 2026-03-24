"use client";

import { Bell, Search, Menu } from "lucide-react";
import { useState } from "react";
import { MobileNav } from "./MobileNav";

export function Header() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between border-b border-black/5 bg-surface-light px-6 py-4">
        {/* Mobile menu button */}
        <button
          className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl hover:bg-black/5 transition-colors"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu className="h-5 w-5 text-text-primary" />
        </button>

        {/* Search */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Search cryptocurrencies..."
              className="w-full rounded-xl border-none bg-bg-light py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button className="relative flex h-10 w-10 items-center justify-center rounded-xl hover:bg-black/5 transition-colors">
            <Bell className="h-5 w-5 text-text-secondary" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-danger" />
          </button>
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">EA</span>
          </div>
        </div>
      </header>

      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </>
  );
}
