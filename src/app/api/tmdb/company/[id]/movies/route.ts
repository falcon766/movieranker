import { NextRequest, NextResponse } from "next/server";
import { isTmdbConfigured } from "@/lib/config";
import type { TmdbMovie } from "@/types/database";

const DEMO_BY_COMPANY: Record<number, TmdbMovie[]> = {
  41077: [
    {
      id: 419430,
      title: "Get Out",
      release_date: "2017-02-24",
      poster_path: "/tFXcEccSQMf3lfhfXKSU9iRBpa3.jpg",
      vote_average: 7.6,
    },
    {
      id: 391713,
      title: "Lady Bird",
      release_date: "2017-11-03",
      poster_path: "/iySFtR2VTJBgHNmgFNGEIjy7KW5.jpg",
      vote_average: 7.3,
    },
  ],
  420: [
    {
      id: 299536,
      title: "Avengers: Infinity War",
      release_date: "2018-04-25",
      poster_path: "/7WsyChQLEftFiDOVTGkv3hIrmUV.jpg",
      vote_average: 8.2,
    },
    {
      id: 24428,
      title: "The Avengers",
      release_date: "2012-04-25",
      poster_path: "/RYMX2wcKcbDmC71Vf2N3kyx1wY.jpg",
      vote_average: 7.7,
    },
  ],
};

function mapMovie(m: TmdbMovie): TmdbMovie {
  return {
    id: m.id,
    title: m.title,
    release_date: m.release_date,
    poster_path: m.poster_path,
    overview: m.overview,
    vote_average: m.vote_average,
    vote_count: m.vote_count,
    popularity: m.popularity,
  };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const companyId = Number.parseInt(rawId, 10);
  if (!Number.isFinite(companyId)) {
    return NextResponse.json({ error: "Invalid company", results: [] }, { status: 400 });
  }

  if (!isTmdbConfigured()) {
    return NextResponse.json({
      results: DEMO_BY_COMPANY[companyId] ?? DEMO_BY_COMPANY[41077] ?? [],
      demo: true,
    });
  }

  const url = new URL("https://api.themoviedb.org/3/discover/movie");
  url.searchParams.set("api_key", process.env.TMDB_API_KEY!);
  url.searchParams.set("with_companies", String(companyId));
  url.searchParams.set("sort_by", "vote_average.desc");
  url.searchParams.set("vote_count.gte", "80");
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("language", "en-US");
  url.searchParams.set("page", "1");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) {
    return NextResponse.json(
      { error: "TMDB request failed", results: [] },
      { status: 502 },
    );
  }

  const data = (await res.json()) as { results?: TmdbMovie[] };
  const results = (data.results ?? [])
    .filter((m) => m?.id && m?.title)
    .slice(0, 40)
    .map(mapMovie);

  return NextResponse.json({ results, demo: false });
}
