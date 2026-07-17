import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-[1] min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line/80 bg-ink/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/app" className="display text-xl">
            MovieRanker
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/app"
              className="rounded-full px-3 py-1.5 text-bone/60 hover:bg-white/5 hover:text-bone"
            >
              Lists
            </Link>
            <Link
              href="/app/import/letterboxd"
              className="rounded-full px-3 py-1.5 text-bone/60 hover:bg-white/5 hover:text-bone"
            >
              Import
            </Link>
            <Link
              href="/app/settings"
              className="rounded-full px-3 py-1.5 text-bone/60 hover:bg-white/5 hover:text-bone"
            >
              Settings
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
