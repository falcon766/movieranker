import { NextRequest, NextResponse } from "next/server";
import { isTmdbConfigured } from "@/lib/config";
import type { SuggestedMovie, TmdbMovie } from "@/types/database";

const DEMO_MOVIES: TmdbMovie[] = [
  {
    id: 680,
    title: "Pulp Fiction",
    release_date: "1994-09-10",
    poster_path: "/vQWk5YBFWF4bZaofAbv0tShwBvQ.jpg",
    vote_average: 8.5,
    vote_count: 28000,
  },
  {
    id: 550,
    title: "Fight Club",
    release_date: "1999-10-15",
    poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    vote_average: 8.4,
    vote_count: 29000,
  },
  {
    id: 13,
    title: "Forrest Gump",
    release_date: "1994-06-23",
    poster_path: "/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
    vote_average: 8.5,
    vote_count: 27000,
  },
  {
    id: 424,
    title: "Schindler's List",
    release_date: "1993-12-15",
    poster_path: "/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg",
    vote_average: 8.6,
    vote_count: 15000,
  },
  {
    id: 497,
    title: "The Green Mile",
    release_date: "1999-12-10",
    poster_path: "/8VG8fDNiy50H4FedGwdSVUPoaJe.jpg",
    vote_average: 8.5,
    vote_count: 17000,
  },
  {
    id: 122,
    title: "The Lord of the Rings: The Return of the King",
    release_date: "2003-12-17",
    poster_path: "/rCzpDGLbOoPwLjy3OAm5NU2Q7eE.jpg",
    vote_average: 8.5,
    vote_count: 24000,
  },
  {
    id: 11,
    title: "Star Wars",
    release_date: "1977-05-25",
    poster_path: "/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg",
    vote_average: 8.2,
    vote_count: 20000,
  },
  {
    id: 603,
    title: "The Matrix",
    release_date: "1999-03-30",
    poster_path: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
    vote_average: 8.2,
    vote_count: 25000,
  },
];

type Seed = { id: number; title: string };

/** Drop obvious junk / obscure titles before scoring. */
const MIN_VOTE_AVERAGE = 6.2;
const MIN_VOTE_COUNT = 150;

/**
 * Quality multiplier from TMDB rating + vote volume.
 * ~0.25 for weak titles, ~1.0 around 7.2★, up to ~1.8 for highly rated classics.
 */
function qualityWeight(movie: TmdbMovie): number {
  const rating = movie.vote_average ?? 0;
  const votes = movie.vote_count ?? 0;
  const popularity = movie.popularity ?? 0;

  if (votes < MIN_VOTE_COUNT || rating < MIN_VOTE_AVERAGE) return 0;

  // Map 6.2–9.0 → roughly 0.55–1.7 (super-linear so 8★+ rise faster)
  const ratingFactor = Math.pow(Math.max(0, (rating - 5.5) / 3.5), 1.35);

  // More votes → more confidence (log scale; ~1k votes ≈ 1.0, 10k+ ≈ 1.25)
  const voteConfidence = Math.min(1.3, 0.55 + Math.log10(votes + 1) / 4);

  // Light popularity nudge so well-known titles edge out obscure mid-rated ones
  const popNudge = Math.min(1.15, 0.9 + Math.log10(popularity + 1) / 8);

  return Math.max(0.2, ratingFactor * voteConfidence * popNudge);
}

function parseIds(raw: string | null) {
  if (!raw) return [] as number[];
  return raw
    .split(",")
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n));
}

async function fetchMovieList(
  path: string,
  apiKey: string,
): Promise<TmdbMovie[]> {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "en-US");
  const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: TmdbMovie[] };
  return data.results ?? [];
}

export async function GET(request: NextRequest) {
  const seedIds = parseIds(request.nextUrl.searchParams.get("ids")).slice(0, 10);
  const exclude = new Set(parseIds(request.nextUrl.searchParams.get("exclude")));
  const seedTitlesRaw = request.nextUrl.searchParams.get("titles");
  const seedTitles = seedTitlesRaw
    ? seedTitlesRaw.split("||").map((t) => decodeURIComponent(t))
    : [];

  const seeds: Seed[] = seedIds.map((id, i) => ({
    id,
    title: seedTitles[i] || `Movie ${id}`,
  }));

  if (!seeds.length) {
    return NextResponse.json({
      results: [],
      demo: !isTmdbConfigured(),
      message: "Add a few movies first, then run suggestions.",
    });
  }

  for (const s of seeds) exclude.add(s.id);

  if (!isTmdbConfigured()) {
    const results: SuggestedMovie[] = DEMO_MOVIES.filter(
      (m) => !exclude.has(m.id),
    )
      .slice(0, 12)
      .map((m, i) => ({
        ...m,
        score: 12 - i,
        because: seeds.slice(0, 2).map((s) => s.title),
      }));
    return NextResponse.json({ results, demo: true });
  }

  const apiKey = process.env.TMDB_API_KEY!;
  const tally = new Map<
    number,
    { movie: TmdbMovie; matchScore: number; because: Set<string> }
  >();

  await Promise.all(
    seeds.map(async (seed) => {
      const [recs, similar] = await Promise.all([
        fetchMovieList(`/movie/${seed.id}/recommendations`, apiKey),
        fetchMovieList(`/movie/${seed.id}/similar`, apiKey),
      ]);

      const weightRec = 3;
      const weightSim = 2;

      for (const [list, weight] of [
        [recs, weightRec],
        [similar, weightSim],
      ] as const) {
        list.forEach((movie, index) => {
          if (!movie?.id || !movie.title || exclude.has(movie.id)) return;

          const slim: TmdbMovie = {
            id: movie.id,
            title: movie.title,
            release_date: movie.release_date,
            poster_path: movie.poster_path,
            overview: movie.overview,
            vote_average: movie.vote_average,
            vote_count: movie.vote_count,
            popularity: movie.popularity,
          };

          // Skip low-rated / barely-voted titles entirely
          if (qualityWeight(slim) <= 0) return;

          const rankBoost = Math.max(1, 12 - Math.floor(index / 2));
          const existing = tally.get(movie.id);
          if (existing) {
            existing.matchScore += weight * rankBoost;
            existing.because.add(seed.title);
            // Keep the richer metadata if a later hit has more votes
            if ((slim.vote_count ?? 0) > (existing.movie.vote_count ?? 0)) {
              existing.movie = slim;
            }
          } else {
            tally.set(movie.id, {
              movie: slim,
              matchScore: weight * rankBoost,
              because: new Set([seed.title]),
            });
          }
        });
      }
    }),
  );

  const results: SuggestedMovie[] = [...tally.values()]
    .map(({ movie, matchScore, because }) => {
      const quality = qualityWeight(movie);
      // Blend: still need multiple seed hits to rise, but quality dominates ties
      const score = matchScore * quality;
      return {
        movie,
        score,
        because: [...because].slice(0, 3),
        quality,
        matchScore,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.movie.vote_average ?? 0) - (a.movie.vote_average ?? 0) ||
        (b.movie.vote_count ?? 0) - (a.movie.vote_count ?? 0),
    )
    .slice(0, 18)
    .map(({ movie, score, because }) => ({
      ...movie,
      score,
      because,
    }));

  return NextResponse.json({ results, demo: false });
}
