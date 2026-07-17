"use client";

import { useEffect, useState } from "react";
import { Poster } from "@/components/ui/Poster";
import type { TmdbMovie } from "@/types/database";

export type SearchDestination = "rank" | "bench";

export function MovieSearch({
  onSelect,
  excludeIds = [],
}: {
  onSelect: (
    movie: TmdbMovie,
    destination: SearchDestination,
  ) => void | Promise<void>;
  excludeIds?: number[];
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<TmdbMovie[]>([]);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (q.trim().length < 1) {
      setResults([]);
      return;
    }

    const handle = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as {
          results: TmdbMovie[];
          demo?: boolean;
          error?: string;
        };
        setDemo(Boolean(data.demo));
        setResults(
          (data.results ?? []).filter((m) => !excludeIds.includes(m.id)),
        );
      } catch {
        setError("Search failed");
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(handle);
  }, [q, excludeIds]);

  async function pick(movie: TmdbMovie, destination: SearchDestination) {
    await onSelect(movie, destination);
    setQ("");
    setResults([]);
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          className="field pr-24"
          placeholder="Search movies…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
        />
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-bone/35">
          {loading ? "Searching" : demo ? "Demo catalog" : "TMDB"}
        </div>
      </div>
      {error && <p className="text-sm text-ember">{error}</p>}
      {results.length > 0 && (
        <ul className="glass max-h-80 overflow-auto rounded-2xl scrollbar-thin">
          {results.map((movie) => {
            const year = movie.release_date?.slice(0, 4);
            return (
              <li
                key={movie.id}
                className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-white/5"
              >
                <div className="relative h-14 w-10 shrink-0">
                  <Poster
                    path={movie.poster_path}
                    title={movie.title}
                    className="h-14 w-10"
                    sizes="40px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{movie.title}</div>
                  <div className="text-sm text-bone/45">{year || "—"}</div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    className="rounded-full bg-amber px-3 py-1.5 text-xs font-semibold text-ink hover:bg-[#e0b06a]"
                    onClick={() => void pick(movie, "rank")}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-line px-3 py-1.5 text-xs text-bone hover:border-amber/40 hover:text-amber"
                    onClick={() => void pick(movie, "bench")}
                  >
                    Bench
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
