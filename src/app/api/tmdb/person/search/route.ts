import { NextRequest, NextResponse } from "next/server";
import { isTmdbConfigured } from "@/lib/config";
import type { TmdbPerson } from "@/types/database";

const DEMO_PEOPLE: TmdbPerson[] = [
  {
    id: 525,
    name: "Christopher Nolan",
    profile_path: null,
    known_for_department: "Directing",
    known_for: ["Inception", "The Dark Knight", "Interstellar"],
  },
  {
    id: 287,
    name: "Brad Pitt",
    profile_path: null,
    known_for_department: "Acting",
    known_for: ["Fight Club", "Inglourious Basterds"],
  },
  {
    id: 138,
    name: "Quentin Tarantino",
    profile_path: null,
    known_for_department: "Directing",
    known_for: ["Pulp Fiction", "Kill Bill"],
  },
  {
    id: 1245,
    name: "Scarlett Johansson",
    profile_path: null,
    known_for_department: "Acting",
    known_for: ["Lost in Translation", "Her"],
  },
];

type TmdbPersonRaw = {
  id: number;
  name: string;
  profile_path: string | null;
  known_for_department?: string;
  known_for?: Array<{ title?: string; name?: string; media_type?: string }>;
};

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ results: [], demo: !isTmdbConfigured() });
  }

  if (!isTmdbConfigured()) {
    const lower = q.toLowerCase();
    const results = DEMO_PEOPLE.filter((p) =>
      p.name.toLowerCase().includes(lower),
    );
    return NextResponse.json({
      results: results.length ? results : DEMO_PEOPLE.slice(0, 3),
      demo: true,
    });
  }

  const url = new URL("https://api.themoviedb.org/3/search/person");
  url.searchParams.set("api_key", process.env.TMDB_API_KEY!);
  url.searchParams.set("query", q);
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

  const data = (await res.json()) as { results?: TmdbPersonRaw[] };
  const results: TmdbPerson[] = (data.results ?? [])
    .filter((p) => p?.id && p?.name)
    .slice(0, 10)
    .map((p) => ({
      id: p.id,
      name: p.name,
      profile_path: p.profile_path ?? null,
      known_for_department: p.known_for_department,
      known_for: (p.known_for ?? [])
        .map((k) => k.title || k.name)
        .filter(Boolean)
        .slice(0, 3) as string[],
    }));

  return NextResponse.json({ results, demo: false });
}
