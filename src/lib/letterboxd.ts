import Papa from "papaparse";
import type { LetterboxdRow } from "@/types/database";

export function parseLetterboxdCsv(csvText: string): LetterboxdRow[] {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length && !parsed.data.length) {
    throw new Error(parsed.errors[0]?.message ?? "Failed to parse CSV");
  }

  const rows: LetterboxdRow[] = [];

  for (const row of parsed.data) {
    const name =
      row.Name?.trim() ||
      row.name?.trim() ||
      row.Title?.trim() ||
      row.title?.trim();
    if (!name) continue;

    const yearRaw = row.Year || row.year || row["Release Year"];
    const ratingRaw = row.Rating || row.rating || row["Letterboxd Rating"];

    const year = yearRaw ? Number.parseInt(yearRaw, 10) : null;
    const rating = ratingRaw ? Number.parseFloat(ratingRaw) : null;

    rows.push({
      name,
      year: Number.isFinite(year) ? year : null,
      rating: Number.isFinite(rating) ? rating : null,
    });
  }

  return rows;
}

export function topByRating(rows: LetterboxdRow[], n: number) {
  return [...rows]
    .filter((r) => r.rating != null)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, n);
}
