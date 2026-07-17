import { NextRequest, NextResponse } from "next/server";
import { isTmdbConfigured } from "@/lib/config";
import type { TmdbMovie } from "@/types/database";

const DEMO_MOVIES: TmdbMovie[] = [
  {
    id: 238,
    title: "The Godfather",
    release_date: "1972-03-14",
    poster_path: "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
    overview: "The aging patriarch of an organized crime dynasty transfers control to his son.",
  },
  {
    id: 278,
    title: "The Shawshank Redemption",
    release_date: "1994-09-23",
    poster_path: "/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg",
  },
  {
    id: 155,
    title: "The Dark Knight",
    release_date: "2008-07-16",
    poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
  },
  {
    id: 27205,
    title: "Inception",
    release_date: "2010-07-15",
    poster_path: "/oYuLEt3zBKgfkcuYlL8Q3TYz5kS.jpg",
  },
  {
    id: 157336,
    title: "Interstellar",
    release_date: "2014-11-05",
    poster_path: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  },
  {
    id: 129,
    title: "Spirited Away",
    release_date: "2001-07-20",
    poster_path: "/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
  },
  {
    id: 497,
    title: "The Green Mile",
    release_date: "1999-12-10",
    poster_path: "/8VG8fDNiy50H4FedGwdSVUPoaJe.jpg",
  },
  {
    id: 424,
    title: "Schindler's List",
    release_date: "1993-12-15",
    poster_path: "/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg",
  },
  {
    id: 680,
    title: "Pulp Fiction",
    release_date: "1994-09-10",
    poster_path: "/vQWk5YBFWF4bZaofAbv0tShwBvQ.jpg",
  },
  {
    id: 13,
    title: "Forrest Gump",
    release_date: "1994-06-23",
    poster_path: "/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
  },
  {
    id: 550,
    title: "Fight Club",
    release_date: "1999-10-15",
    poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
  },
  {
    id: 122,
    title: "The Lord of the Rings: The Return of the King",
    release_date: "2003-12-17",
    poster_path: "/rCzpDGLbOoPwLjy3OAm5NU2Q7eE.jpg",
  },
];

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ results: [], demo: !isTmdbConfigured() });
  }

  if (!isTmdbConfigured()) {
    const lower = q.toLowerCase();
    const results = DEMO_MOVIES.filter((m) =>
      m.title.toLowerCase().includes(lower),
    ).slice(0, 8);
    return NextResponse.json({
      results: results.length ? results : DEMO_MOVIES.slice(0, 6),
      demo: true,
    });
  }

  const url = new URL("https://api.themoviedb.org/3/search/movie");
  url.searchParams.set("api_key", process.env.TMDB_API_KEY!);
  url.searchParams.set("query", q);
  url.searchParams.set("include_adult", "false");
  url.searchParams.set("language", "en-US");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) {
    return NextResponse.json(
      { error: "TMDB request failed", results: [] },
      { status: 502 },
    );
  }

  const data = (await res.json()) as { results: TmdbMovie[] };
  const results = (data.results ?? [])
    .filter((m) => m.title)
    .slice(0, 10)
    .map((m) => ({
      id: m.id,
      title: m.title,
      release_date: m.release_date,
      poster_path: m.poster_path,
      overview: m.overview,
      vote_average: m.vote_average,
    }));

  return NextResponse.json({ results, demo: false });
}
