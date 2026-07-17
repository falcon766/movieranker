import { NextRequest, NextResponse } from "next/server";
import { isTmdbConfigured } from "@/lib/config";
import type { TmdbCompany } from "@/types/database";

const DEMO_COMPANIES: TmdbCompany[] = [
  { id: 41077, name: "A24", logo_path: null, origin_country: "US" },
  { id: 420, name: "Marvel Studios", logo_path: null, origin_country: "US" },
  { id: 33, name: "Universal Pictures", logo_path: null, origin_country: "US" },
  { id: 174, name: "Warner Bros. Pictures", logo_path: null, origin_country: "US" },
  { id: 4, name: "Paramount", logo_path: null, origin_country: "US" },
];

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ results: [], demo: !isTmdbConfigured() });
  }

  if (!isTmdbConfigured()) {
    const lower = q.toLowerCase();
    const results = DEMO_COMPANIES.filter((c) =>
      c.name.toLowerCase().includes(lower),
    );
    return NextResponse.json({
      results: results.length ? results : DEMO_COMPANIES.slice(0, 3),
      demo: true,
    });
  }

  const url = new URL("https://api.themoviedb.org/3/search/company");
  url.searchParams.set("api_key", process.env.TMDB_API_KEY!);
  url.searchParams.set("query", q);
  url.searchParams.set("page", "1");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) {
    return NextResponse.json(
      { error: "TMDB request failed", results: [] },
      { status: 502 },
    );
  }

  const data = (await res.json()) as { results?: TmdbCompany[] };
  const results = (data.results ?? [])
    .filter((c) => c?.id && c?.name)
    .slice(0, 10)
    .map((c) => ({
      id: c.id,
      name: c.name,
      logo_path: c.logo_path ?? null,
      origin_country: c.origin_country,
    }));

  return NextResponse.json({ results, demo: false });
}
