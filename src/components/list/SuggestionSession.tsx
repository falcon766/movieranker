"use client";

import { useState } from "react";
import { Poster } from "@/components/ui/Poster";
import type { ListItem, SuggestedMovie, TmdbMovie } from "@/types/database";
import type { SearchDestination } from "@/components/MovieSearch";

export function SuggestionSession({
  items,
  onPick,
}: {
  items: ListItem[];
  onPick: (movie: TmdbMovie, destination: SearchDestination) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [results, setResults] = useState<SuggestedMovie[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const seeds = [...items]
    .sort((a, b) => {
      if (a.position != null && b.position != null) return a.position - b.position;
      if (a.position != null) return -1;
      if (b.position != null) return 1;
      return b.elo - a.elo;
    })
    .slice(0, 10);

  async function runSession() {
    if (seeds.length < 1) {
      setError("Add at least one movie first.");
      setOpen(true);
      return;
    }

    setOpen(true);
    setLoading(true);
    setError(null);

    try {
      const ids = seeds.map((s) => s.tmdb_id).join(",");
      const titles = seeds
        .map((s) => encodeURIComponent(s.title))
        .join("||");
      const exclude = items.map((i) => i.tmdb_id).join(",");
      const res = await fetch(
        `/api/tmdb/suggest?ids=${ids}&titles=${titles}&exclude=${exclude}`,
      );
      const data = (await res.json()) as {
        results: SuggestedMovie[];
        demo?: boolean;
        message?: string;
      };
      setDemo(Boolean(data.demo));
      setResults(data.results ?? []);
      if (!data.results?.length) {
        setError(data.message || "No close matches found — try adding a few more titles.");
      }
    } catch {
      setError("Could not load suggestions.");
    } finally {
      setLoading(false);
    }
  }

  const visible = results.filter((r) => !dismissed.has(r.id));

  return (
    <section className="glass rounded-[2rem] p-5 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Suggestion session</p>
          <h2 className="display mt-1 text-2xl sm:text-3xl">
            Close matches from your list
          </h2>
          <p className="mt-2 max-w-lg text-sm text-bone/50">
            Uses TMDB recommendations & similar titles based on what you’ve
            already stacked{seeds.length ? ` (${seeds.length} seeds)` : ""}.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void runSession()}
          disabled={loading}
        >
          {loading ? "Finding matches…" : open ? "Refresh suggestions" : "Start session"}
        </button>
      </div>

      {open && (
        <div className="mt-6 space-y-4">
          {demo && (
            <p className="text-xs text-amber/80">
              Demo catalog — add a TMDB key for live recommendations.
            </p>
          )}
          {error && <p className="text-sm text-ember">{error}</p>}
          {!loading && !error && visible.length === 0 && (
            <p className="text-sm text-bone/45">No suggestions left in this session.</p>
          )}
          <ul className="grid gap-3 sm:grid-cols-2">
            {visible.map((movie) => {
              const year = movie.release_date?.slice(0, 4);
              return (
                <li
                  key={movie.id}
                  className="flex gap-3 rounded-2xl border border-line bg-black/25 p-3"
                >
                  <div className="relative h-24 w-16 shrink-0">
                    <Poster
                      path={movie.poster_path}
                      title={movie.title}
                      className="h-24 w-16"
                      sizes="64px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{movie.title}</div>
                    <div className="text-xs text-bone/40">
                      {year || "—"}
                      {movie.vote_average
                        ? ` · ★ ${movie.vote_average.toFixed(1)}`
                        : ""}
                    </div>
                    {movie.because?.length > 0 && (
                      <p className="mt-1 line-clamp-2 text-xs text-bone/45">
                        Because you have{" "}
                        <span className="text-amber/90">
                          {movie.because.join(", ")}
                        </span>
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        className="rounded-full bg-amber px-3 py-1 text-xs font-semibold text-ink"
                        onClick={async () => {
                          await onPick(movie, "rank");
                          setDismissed((prev) => new Set(prev).add(movie.id));
                        }}
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-line px-3 py-1 text-xs hover:border-amber/40 hover:text-amber"
                        onClick={async () => {
                          await onPick(movie, "bench");
                          setDismissed((prev) => new Set(prev).add(movie.id));
                        }}
                      >
                        Bench
                      </button>
                      <button
                        type="button"
                        className="rounded-full px-2 py-1 text-xs text-bone/35 hover:text-bone/60"
                        onClick={() =>
                          setDismissed((prev) => new Set(prev).add(movie.id))
                        }
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
