import { NextRequest, NextResponse } from "next/server";
import { isTmdbConfigured } from "@/lib/config";
import type { TmdbMovie } from "@/types/database";

const CREW_JOBS = new Set([
  "Director",
  "Writer",
  "Screenplay",
  "Story",
  "Novel",
  "Characters",
]);

type CreditRow = TmdbMovie & {
  character?: string;
  job?: string;
  department?: string;
  order?: number;
};

function roleLabel(credit: CreditRow, kind: "cast" | "crew"): string | null {
  if (kind === "cast") return "Actor";
  const job = credit.job ?? "";
  if (job === "Director") return "Director";
  if (CREW_JOBS.has(job)) return "Writer";
  return null;
}

function mapMovie(m: TmdbMovie, roles: string[]): TmdbMovie {
  return {
    id: m.id,
    title: m.title,
    release_date: m.release_date,
    poster_path: m.poster_path,
    overview: m.overview,
    vote_average: m.vote_average,
    vote_count: m.vote_count,
    popularity: m.popularity,
    credit_roles: roles,
  };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const personId = Number.parseInt(rawId, 10);
  if (!Number.isFinite(personId)) {
    return NextResponse.json({ error: "Invalid person", results: [] }, { status: 400 });
  }

  if (!isTmdbConfigured()) {
    return NextResponse.json({
      results: [
        {
          id: 27205,
          title: "Inception",
          release_date: "2010-07-15",
          poster_path: "/oYuLEt3zBKgfkcuYlL8Q3TYz5kS.jpg",
          vote_average: 8.4,
          credit_roles: ["Director", "Writer"],
        },
        {
          id: 155,
          title: "The Dark Knight",
          release_date: "2008-07-16",
          poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
          vote_average: 8.5,
          credit_roles: ["Director"],
        },
      ] satisfies TmdbMovie[],
      demo: true,
    });
  }

  const url = new URL(
    `https://api.themoviedb.org/3/person/${personId}/movie_credits`,
  );
  url.searchParams.set("api_key", process.env.TMDB_API_KEY!);
  url.searchParams.set("language", "en-US");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) {
    return NextResponse.json(
      { error: "TMDB request failed", results: [] },
      { status: 502 },
    );
  }

  const data = (await res.json()) as {
    cast?: CreditRow[];
    crew?: CreditRow[];
  };

  const byId = new Map<number, { movie: TmdbMovie; roles: Set<string> }>();

  for (const credit of data.cast ?? []) {
    if (!credit?.id || !credit.title) continue;
    const role = roleLabel(credit, "cast");
    if (!role) continue;
    const existing = byId.get(credit.id);
    if (existing) existing.roles.add(role);
    else {
      byId.set(credit.id, {
        movie: credit,
        roles: new Set([role]),
      });
    }
  }

  for (const credit of data.crew ?? []) {
    if (!credit?.id || !credit.title) continue;
    const role = roleLabel(credit, "crew");
    if (!role) continue;
    const existing = byId.get(credit.id);
    if (existing) existing.roles.add(role);
    else {
      byId.set(credit.id, {
        movie: credit,
        roles: new Set([role]),
      });
    }
  }

  const results = [...byId.values()]
    .map(({ movie, roles }) => mapMovie(movie, [...roles]))
    .sort((a, b) => {
      const scoreA =
        (a.vote_average ?? 0) * Math.log10((a.vote_count ?? 0) + 10);
      const scoreB =
        (b.vote_average ?? 0) * Math.log10((b.vote_count ?? 0) + 10);
      return scoreB - scoreA || (b.popularity ?? 0) - (a.popularity ?? 0);
    })
    .slice(0, 50);

  return NextResponse.json({ results, demo: false });
}
