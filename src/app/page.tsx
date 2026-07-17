import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative z-[1]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[85vh] overflow-hidden">
        <div className="absolute -left-20 top-10 h-72 w-52 rotate-[-12deg] rounded-xl bg-[url('https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg')] bg-cover opacity-30 blur-[1px]" />
        <div className="absolute right-[-2rem] top-24 h-80 w-56 rotate-[8deg] rounded-xl bg-[url('https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg')] bg-cover opacity-25" />
        <div className="absolute bottom-10 left-1/3 h-64 w-44 rotate-[-4deg] rounded-xl bg-[url('https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg')] bg-cover opacity-20 blur-[0.5px]" />
      </div>

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <div className="display text-2xl tracking-tight">MovieRanker</div>
        <nav className="flex items-center gap-2">
          <Link href="/login" className="btn btn-ghost !py-2 !text-sm">
            Log in
          </Link>
          <Link href="/app" className="btn btn-primary !py-2 !text-sm">
            Open app
          </Link>
        </nav>
      </header>

      <section className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-end px-5 pb-16 pt-24 sm:justify-center sm:pb-24">
        <p className="eyebrow mb-4">All-time lists · Battles · Letterboxd</p>
        <h1 className="display max-w-3xl text-5xl leading-[0.95] sm:text-7xl md:text-8xl">
          MovieRanker
        </h1>
        <p className="mt-5 max-w-xl text-lg text-bone/65 sm:text-xl">
          Rank your all-time. Share the order.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/app" className="btn btn-primary">
            Start your list
          </Link>
          <Link href="/signup" className="btn btn-ghost">
            Create account
          </Link>
        </div>
      </section>

      <section className="relative border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-3">
          {[
            {
              title: "Search & drop",
              body: "Type a few letters. Posters, years, and titles fill in from TMDB.",
            },
            {
              title: "Battle it out",
              body: "Stuck between two? Hot-or-not matchups reshape your ranking with Elo.",
            },
            {
              title: "Import & share",
              body: "Pull in Letterboxd ratings, then share public or invite-only.",
            },
          ].map((f) => (
            <div key={f.title}>
              <h2 className="display text-2xl">{f.title}</h2>
              <p className="mt-3 text-bone/55">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative border-t border-line px-5 py-10 text-center text-sm text-bone/35">
        MovieRanker · This product uses the TMDB API but is not endorsed or
        certified by TMDB.
      </footer>
    </main>
  );
}
