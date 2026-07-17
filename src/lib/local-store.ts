"use client";

import { nanoid } from "nanoid";
import type { ListItem, ListVisibility, MovieList } from "@/types/database";
import { slugify } from "@/lib/slug";
import {
  eloFromLetterboxdStars,
  eloPair,
  reindexPositions,
  sortByEloThenPosition,
} from "@/lib/elo";

const LISTS_KEY = "movieranker.lists";
const ITEMS_KEY = "movieranker.items";
const PROFILE_KEY = "movieranker.profile";

export type LocalProfile = {
  id: string;
  username: string;
  display_name: string;
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getLocalProfile(): LocalProfile {
  const existing = read<LocalProfile | null>(PROFILE_KEY, null);
  if (existing) return existing;
  const profile: LocalProfile = {
    id: "local-user",
    username: "you",
    display_name: "You",
  };
  write(PROFILE_KEY, profile);
  return profile;
}

export function getLocalLists(): MovieList[] {
  return read<MovieList[]>(LISTS_KEY, []).sort(
    (a, b) => +new Date(b.updated_at) - +new Date(a.updated_at),
  );
}

export function getLocalList(id: string) {
  return getLocalLists().find((l) => l.id === id) ?? null;
}

export function getLocalItems(listId: string): ListItem[] {
  return read<ListItem[]>(ITEMS_KEY, []).filter((i) => i.list_id === listId);
}

export function createLocalList(input: {
  title: string;
  target_size: number;
  description?: string;
  visibility?: ListVisibility;
}) {
  const profile = getLocalProfile();
  const now = new Date().toISOString();
  const list: MovieList = {
    id: nanoid(),
    owner_id: profile.id,
    title: input.title,
    slug: slugify(input.title),
    description: input.description ?? null,
    target_size: input.target_size,
    visibility: input.visibility ?? "unlisted",
    allow_overflow: true,
    created_at: now,
    updated_at: now,
  };
  write(LISTS_KEY, [list, ...getLocalLists()]);
  return list;
}

export function updateLocalList(id: string, patch: Partial<MovieList>) {
  const lists = getLocalLists().map((l) =>
    l.id === id
      ? { ...l, ...patch, updated_at: new Date().toISOString() }
      : l,
  );
  write(LISTS_KEY, lists);
  return lists.find((l) => l.id === id) ?? null;
}

export function deleteLocalList(id: string) {
  write(
    LISTS_KEY,
    getLocalLists().filter((l) => l.id !== id),
  );
  write(
    ITEMS_KEY,
    read<ListItem[]>(ITEMS_KEY, []).filter((i) => i.list_id !== id),
  );
}

function touchList(listId: string) {
  updateLocalList(listId, {});
}

export function saveLocalItems(listId: string, items: ListItem[]) {
  const others = read<ListItem[]>(ITEMS_KEY, []).filter(
    (i) => i.list_id !== listId,
  );
  write(ITEMS_KEY, [...others, ...items]);
  touchList(listId);
}

export function addLocalMovie(
  listId: string,
  movie: {
    tmdb_id: number;
    title: string;
    year: number | null;
    poster_path: string | null;
    source?: ListItem["source"];
    elo?: number;
    asBench?: boolean;
  },
) {
  const items = getLocalItems(listId);
  if (items.some((i) => i.tmdb_id === movie.tmdb_id)) {
    throw new Error("Already on this list");
  }

  const ranked = items.filter((i) => i.position != null);
  const now = new Date().toISOString();
  const item: ListItem = {
    id: nanoid(),
    list_id: listId,
    tmdb_id: movie.tmdb_id,
    title: movie.title,
    year: movie.year,
    poster_path: movie.poster_path,
    position: movie.asBench ? null : ranked.length + 1,
    elo: movie.elo ?? 1000,
    notes: null,
    source: movie.source ?? "manual",
    locked: false,
    created_at: now,
    updated_at: now,
  };

  saveLocalItems(listId, [...items, item]);
  return item;
}

export function reorderLocalRanked(listId: string, orderedIds: string[]) {
  const items = getLocalItems(listId);
  const byId = new Map(items.map((i) => [i.id, i]));
  const ranked = orderedIds
    .map((id, index) => {
      const item = byId.get(id);
      if (!item) return null;
      return {
        ...item,
        position: index + 1,
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean) as ListItem[];

  const bench = items.filter((i) => !orderedIds.includes(i.id));
  saveLocalItems(listId, [...ranked, ...bench]);
}

export function applyLocalBattle(
  listId: string,
  winnerId: string,
  loserId: string,
  draw = false,
) {
  const items = getLocalItems(listId);
  const winner = items.find((i) => i.id === winnerId);
  const loser = items.find((i) => i.id === loserId);
  if (!winner || !loser) throw new Error("Items missing");

  const next = eloPair(winner.elo, loser.elo, draw);
  const updated = items.map((i) => {
    if (i.id === winnerId) return { ...i, elo: next.winner, position: i.position ?? 999 };
    if (i.id === loserId) return { ...i, elo: next.loser, position: i.position ?? 999 };
    return i;
  });

  const ranked = reindexPositions(
    sortByEloThenPosition(updated.filter((i) => i.position != null || i.id === winnerId || i.id === loserId)),
  );
  // Keep pure bench items (never ranked) out unless they fought
  const benchOnly = updated.filter(
    (i) => i.position == null && i.id !== winnerId && i.id !== loserId,
  );

  const merged = [
    ...ranked,
    ...benchOnly.map((i) => ({ ...i, position: null as number | null })),
  ];
  saveLocalItems(listId, merged);
  return { winnerElo: next.winner, loserElo: next.loser };
}

export function seedFromLetterboxdLocal(
  listId: string,
  rows: { name: string; year: number | null; rating: number | null; tmdb_id: number; poster_path: string | null; title: string }[],
  mode: "bench" | "prefill" | "both",
) {
  for (const row of rows) {
    try {
      addLocalMovie(listId, {
        tmdb_id: row.tmdb_id,
        title: row.title || row.name,
        year: row.year,
        poster_path: row.poster_path,
        source: "letterboxd",
        elo: row.rating != null ? eloFromLetterboxdStars(row.rating) : 1000,
        asBench: mode === "bench",
      });
    } catch {
      // duplicate — skip
    }
  }

  if (mode === "prefill" || mode === "both") {
    const items = getLocalItems(listId);
    const sorted = reindexPositions(sortByEloThenPosition(items));
    saveLocalItems(listId, sorted);
  }
}
