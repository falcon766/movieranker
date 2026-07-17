"use client";

import { useEffect, useState } from "react";
import { Poster } from "@/components/ui/Poster";
import { TMDB_IMAGE_BASE } from "@/lib/config";
import type { TmdbCompany, TmdbMovie, TmdbPerson } from "@/types/database";

export type SearchDestination = "rank" | "bench";
type SearchMode = "title" | "studio" | "person";

type Entity =
  | { kind: "studio"; company: TmdbCompany }
  | { kind: "person"; person: TmdbPerson };

const MODES: { id: SearchMode; label: string }[] = [
  { id: "title", label: "Title" },
  { id: "studio", label: "Studio" },
  { id: "person", label: "Person" },
];

function profileUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/w185${path}`;
}

function logoUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/w92${path}`;
}

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
  const [mode, setMode] = useState<SearchMode>("title");
  const [q, setQ] = useState("");
  const [movies, setMovies] = useState<TmdbMovie[]>([]);
  const [companies, setCompanies] = useState<TmdbCompany[]>([]);
  const [people, setPeople] = useState<TmdbPerson[]>([]);
  const [entity, setEntity] = useState<Entity | null>(null);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetLists() {
    setMovies([]);
    setCompanies([]);
    setPeople([]);
  }

  function switchMode(next: SearchMode) {
    setMode(next);
    setQ("");
    setEntity(null);
    setError(null);
    setLoading(false);
    resetLists();
  }

  function clearEntity() {
    setEntity(null);
    setMovies([]);
    setError(null);
    setLoading(false);
  }

  const queryActive = q.trim().length >= 1;

  // Title search OR studio/person entity search
  useEffect(() => {
    if (entity) return;
    if (q.trim().length < 1) return;

    const handle = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        if (mode === "title") {
          const res = await fetch(
            `/api/tmdb/search?q=${encodeURIComponent(q)}`,
          );
          const data = (await res.json()) as {
            results: TmdbMovie[];
            demo?: boolean;
          };
          setDemo(Boolean(data.demo));
          setCompanies([]);
          setPeople([]);
          setMovies(
            (data.results ?? []).filter((m) => !excludeIds.includes(m.id)),
          );
        } else if (mode === "studio") {
          const res = await fetch(
            `/api/tmdb/company/search?q=${encodeURIComponent(q)}`,
          );
          const data = (await res.json()) as {
            results: TmdbCompany[];
            demo?: boolean;
          };
          setDemo(Boolean(data.demo));
          setMovies([]);
          setPeople([]);
          setCompanies(data.results ?? []);
        } else {
          const res = await fetch(
            `/api/tmdb/person/search?q=${encodeURIComponent(q)}`,
          );
          const data = (await res.json()) as {
            results: TmdbPerson[];
            demo?: boolean;
          };
          setDemo(Boolean(data.demo));
          setMovies([]);
          setCompanies([]);
          setPeople(data.results ?? []);
        }
      } catch {
        setError("Search failed");
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(handle);
  }, [q, mode, entity, excludeIds]);

  // Load films after picking a studio/person
  useEffect(() => {
    if (!entity) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setMovies([]);
      try {
        const path =
          entity.kind === "studio"
            ? `/api/tmdb/company/${entity.company.id}/movies`
            : `/api/tmdb/person/${entity.person.id}/movies`;
        const res = await fetch(path);
        const data = (await res.json()) as {
          results: TmdbMovie[];
          demo?: boolean;
          error?: string;
        };
        if (cancelled) return;
        setDemo(Boolean(data.demo));
        setMovies(
          (data.results ?? []).filter((m) => !excludeIds.includes(m.id)),
        );
        if (!data.results?.length) {
          setError(data.error || "No movies found for that pick.");
        }
      } catch {
        if (!cancelled) setError("Could not load movies");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [entity, excludeIds]);

  async function pickMovie(movie: TmdbMovie, destination: SearchDestination) {
    await onSelect(movie, destination);
    setMovies((prev) => prev.filter((m) => m.id !== movie.id));
  }

  const placeholder =
    mode === "title"
      ? "Search movies…"
      : mode === "studio"
        ? "Search studios — A24, Marvel Studios…"
        : "Search people — Nolan, Johansson…";

  const entityLabel =
    entity?.kind === "studio"
      ? entity.company.name
      : entity?.kind === "person"
        ? entity.person.name
        : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => switchMode(m.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] transition ${
              mode === m.id
                ? "bg-amber/20 text-amber"
                : "text-bone/40 hover:bg-white/5 hover:text-bone/70"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {entity ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-black/20 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-bone/35">
              {entity.kind === "studio" ? "Studio" : "Person"}
            </p>
            <p className="truncate font-medium text-amber">{entityLabel}</p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-full px-3 py-1 text-xs text-bone/50 hover:bg-white/5 hover:text-bone"
            onClick={clearEntity}
          >
            ← Change
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            className="field pr-24"
            placeholder={placeholder}
            value={q}
            onChange={(e) => {
              const next = e.target.value;
              setQ(next);
              if (next.trim().length < 1) {
                resetLists();
                setError(null);
              }
            }}
            autoComplete="off"
          />
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-bone/35">
            {loading ? "Searching" : demo ? "Demo catalog" : "TMDB"}
          </div>
        </div>
      )}

      {mode !== "title" && !entity && (
        <p className="text-xs text-bone/40">
          Pick a {mode === "studio" ? "studio" : "person"} first — then add
          their films. Title search stays separate.
        </p>
      )}

      {error && <p className="text-sm text-ember">{error}</p>}

      {!entity && queryActive && companies.length > 0 && (
        <ul className="glass max-h-80 overflow-auto rounded-2xl scrollbar-thin">
          {companies.map((company) => {
            const logo = logoUrl(company.logo_path);
            return (
              <li key={company.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-white/5"
                  onClick={() => {
                    setQ("");
                    setCompanies([]);
                    setEntity({ kind: "studio", company });
                  }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/90">
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logo}
                        alt=""
                        className="max-h-8 max-w-8 object-contain"
                      />
                    ) : (
                      <span className="text-xs font-semibold text-ink">
                        {company.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{company.name}</div>
                    <div className="text-xs text-bone/40">
                      {company.origin_country
                        ? `Studio · ${company.origin_country}`
                        : "Studio"}
                    </div>
                  </div>
                  <span className="text-xs text-amber">Browse →</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {!entity && queryActive && people.length > 0 && (
        <ul className="glass max-h-80 overflow-auto rounded-2xl scrollbar-thin">
          {people.map((person) => {
            const photo = profileUrl(person.profile_path);
            return (
              <li key={person.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-white/5"
                  onClick={() => {
                    setQ("");
                    setPeople([]);
                    setEntity({ kind: "person", person });
                  }}
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-ink-3">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-bone/40">
                        {person.name
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{person.name}</div>
                    <div className="truncate text-xs text-bone/40">
                      {person.known_for_department || "Person"}
                      {person.known_for?.length
                        ? ` · ${person.known_for.join(", ")}`
                        : ""}
                    </div>
                  </div>
                  <span className="text-xs text-amber">Browse →</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {((mode === "title" && queryActive) || entity) && movies.length > 0 && (
        <ul className="glass max-h-80 overflow-auto rounded-2xl scrollbar-thin">
          {entity && (
            <li className="sticky top-0 border-b border-line bg-ink-2/95 px-3 py-2 text-xs text-bone/45 backdrop-blur">
              {movies.length} titles
              {loading ? " · loading…" : ""}
            </li>
          )}
          {movies.map((movie) => {
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
                  <div className="text-sm text-bone/45">
                    {year || "—"}
                    {movie.vote_average
                      ? ` · ★ ${movie.vote_average.toFixed(1)}`
                      : ""}
                    {movie.credit_roles?.length
                      ? ` · ${movie.credit_roles.join(", ")}`
                      : ""}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    className="rounded-full bg-amber px-3 py-1.5 text-xs font-semibold text-ink hover:bg-[#e0b06a]"
                    onClick={() => void pickMovie(movie, "rank")}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-line px-3 py-1.5 text-xs text-bone hover:border-amber/40 hover:text-amber"
                    onClick={() => void pickMovie(movie, "bench")}
                  >
                    Bench
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {entity && !loading && movies.length === 0 && !error && (
        <p className="text-sm text-bone/45">
          Everything from this pick is already on your list — or nothing matched.
        </p>
      )}
    </div>
  );
}
