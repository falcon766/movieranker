"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { parseLetterboxdCsv, topByRating } from "@/lib/letterboxd";
import {
  addLocalMovie,
  getLocalLists,
  seedFromLetterboxdLocal,
} from "@/lib/local-store";
import type { LetterboxdRow, MovieList, TmdbMovie } from "@/types/database";
import { eloFromLetterboxdStars } from "@/lib/elo";

type Mode = "bench" | "prefill" | "both";

export default function LetterboxdImportPage() {
  const [lists, setLists] = useState<MovieList[]>([]);
  const [listId, setListId] = useState("");
  const [rows, setRows] = useState<LetterboxdRow[]>([]);
  const [mode, setMode] = useState<Mode>("both");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const all = getLocalLists();
    setLists(all);
    if (all[0]) setListId(all[0].id);
  }, []);

  async function onFile(file: File) {
    const text = await file.text();
    const parsed = parseLetterboxdCsv(text);
    setRows(parsed);
    setStatus(`Parsed ${parsed.length} ratings from ${file.name}`);
  }

  async function searchTmdb(name: string, year: number | null) {
    const q = year ? `${name}` : name;
    const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}`);
    const data = (await res.json()) as { results: TmdbMovie[] };
    const results = data.results ?? [];
    if (!results.length) return null;
    if (year) {
      const exact = results.find(
        (r) => r.release_date?.startsWith(String(year)),
      );
      if (exact) return exact;
    }
    return results[0];
  }

  async function runImport() {
    if (!listId || !rows.length) return;
    setBusy(true);
    setStatus("Matching to TMDB…");
    try {
      const candidates =
        mode === "bench" ? rows.slice(0, 40) : topByRating(rows, 40);
      const matched: {
        name: string;
        year: number | null;
        rating: number | null;
        tmdb_id: number;
        poster_path: string | null;
        title: string;
      }[] = [];

      for (const row of candidates) {
        const movie = await searchTmdb(row.name, row.year);
        if (!movie) continue;
        matched.push({
          name: row.name,
          year: row.year,
          rating: row.rating,
          tmdb_id: movie.id,
          poster_path: movie.poster_path,
          title: movie.title,
        });
      }

      if (mode === "bench") {
        for (const m of matched) {
          try {
            addLocalMovie(listId, {
              tmdb_id: m.tmdb_id,
              title: m.title,
              year: m.year,
              poster_path: m.poster_path,
              source: "letterboxd",
              elo:
                m.rating != null ? eloFromLetterboxdStars(m.rating) : 1000,
              asBench: true,
            });
          } catch {
            /* dup */
          }
        }
      } else {
        seedFromLetterboxdLocal(listId, matched, mode);
      }

      setStatus(
        `Matched ${matched.length} films into your list (${mode}).`,
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <p className="eyebrow">Letterboxd</p>
      <h1 className="display mt-2 text-4xl">Import your ratings</h1>
      <p className="mt-3 text-bone/55">
        Export a CSV from Letterboxd (Settings → Import & Export → Export your
        data → ratings.csv), then upload it here. We never scrape Letterboxd.
      </p>

      {!lists.length ? (
        <div className="glass mt-10 rounded-3xl p-8 text-center">
          <p>Create a list first, then import into it.</p>
          <Link href="/app/lists/new" className="btn btn-primary mt-6">
            New list
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm text-bone/50">
              Destination list
            </label>
            <select
              className="field"
              value={listId}
              onChange={(e) => setListId(e.target.value)}
            >
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-bone/50">
              ratings.csv
            </label>
            <input
              type="file"
              accept=".csv,text/csv"
              className="field"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onFile(file);
              }}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-bone/50">
              Import mode
            </label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["bench", "Bench only"],
                  ["prefill", "Prefill top by rating"],
                  ["both", "Bench + rank by rating"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`btn !py-2 !text-sm ${
                    mode === value ? "btn-primary" : "btn-ghost"
                  }`}
                  onClick={() => setMode(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {status && (
            <p className="rounded-2xl border border-line bg-white/5 px-4 py-3 text-sm">
              {status}
              {rows.length > 0 && ` · ${rows.length} rows ready`}
            </p>
          )}

          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={busy || !rows.length}
            onClick={() => void runImport()}
          >
            {busy ? "Importing…" : "Import into list"}
          </button>

          {listId && (
            <Link
              href={`/app/lists/${listId}`}
              className="btn btn-ghost w-full"
            >
              Open list
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
