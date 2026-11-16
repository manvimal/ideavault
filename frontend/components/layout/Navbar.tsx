"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lightbulb, Plus } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="glass sticky top-0 z-20 border-b border-brand-100/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-card transition-transform group-hover:scale-105">
            <Lightbulb size={18} strokeWidth={2.25} />
          </span>
          <span className="bg-gradient-to-r from-brand-700 to-brand-500 bg-clip-text text-lg font-bold tracking-tight text-transparent">
            Idea Vault
          </span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/"
            className={`hidden text-sm font-medium transition-colors sm:block ${
              isHome ? "text-brand-700" : "text-slate-500 hover:text-brand-600"
            }`}
          >
            Ideas
          </Link>
          <Link
            href="/ideas/new"
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-2 text-sm font-medium text-white shadow-card transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            <Plus size={16} strokeWidth={2.5} />
            New Idea
          </Link>
        </nav>
      </div>
    </header>
  );
}
