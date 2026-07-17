import { NextRequest, NextResponse } from "next/server";
import { isTmdbConfigured } from "@/lib/config";
import type { SuggestedMovie, TmdbMovie } from "@/types/database";

const DEMO_MOVIES: TmdbMovie[] = [
  {
    id: 680,
    title: "Pulp Fiction",
    release_date: "1994-09-10",
    poster_path: "/vQWk5YBFWF4bZaofAbv0tShwBvQ.jpg",
  },
  {
    id: 550,
    title: "Fight Club",
    release_date: "1999-10-15",
    poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
  },
  {
    id: 13,
    title: "Forrest Gump",
    release_date: "1994-06-23",
    poster_path: "/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
  },
  {
    id: 424,
    title: "Schindler's List",
    release_date: "1993-12-15",
    poster_path: "/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg",
  },
  {
    id: 497,
    title: "The Green Mile",
    release_date: "1999-12-10",
    poster_path: "/8VG8fDNiy50H4FedGwdSVUPoaJe.jpg",
  },
  {
    id: 122,
    title: "The Lord of the Rings: The Return of the King",
    release_date: "2003-12-17",
    poster_path: "/rCzpDGLbOoPwLjy3OAm5NU2Q7eE.jpg",
  },
  {
    id: 11,
    title: "Star Wars",
    release_date: "1977-05-25",
    poster_path: "/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg",
  },
  {
    id: 603,
    title: "The Matrix",
    release_date: "1999-03-30",
    poster_path: "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
  },
];

type Seed = { id: number; title: string };

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
    { movie: TmdbMovie; score: number; because: Set<string> }
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
          const rankBoost = Math.max(1, 12 - Math.floor(index / 2));
          const existing = tally.get(movie.id);
          if (existing) {
            existing.score += weight * rankBoost;
            existing.because.add(seed.title);
          } else {
            tally.set(movie.id, {
              movie: {
                id: movie.id,
                title: movie.title,
                release_date: movie.release_date,
                poster_path: movie.poster_path,
                overview: movie.overview,
                vote_average: movie.vote_average,
              },
              score: weight * rankBoost,
              because: new Set([seed.title]),
            });
          }
        });
      }
    }),
  );

  const results: SuggestedMovie[] = [...tally.values()]
    .sort((a, b) => b.score - a.score || (b.movie.vote_average ?? 0) - (a.movie.vote_average ?? 0))
    .slice(0, 18)
    .map(({ movie, score, because }) => ({
      ...movie,
      score,
      because: [...because].slice(0, 3),
    }));

  return NextResponse.json({ results, demo: false });
}
