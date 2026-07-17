"use client";

import { nanoid } from "nanoid";
import { isSupabaseConfigured } from "@/lib/config";
import {
  eloFromLetterboxdStars,
  eloPair,
  reindexPositions,
  sortByEloThenPosition,
} from "@/lib/elo";
import {
  addLocalMovie,
  applyLocalBattle,
  clearLocalListsData,
  createLocalList,
  deleteLocalList,
  getLocalItems,
  getLocalList,
  getLocalLists,
  getLocalProfile,
  moveLocalToBench,
  reorderLocalRanked,
  saveLocalItems,
  seedFromLetterboxdLocal,
  updateLocalList,
} from "@/lib/local-store";
import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/client";
import type { ListItem, ListVisibility, MovieList, Profile } from "@/types/database";

export type AuthContext = {
  cloud: boolean;
  userId: string | null;
  profile: Profile | null;
};

function mapItem(row: Record<string, unknown>): ListItem {
  return {
    id: String(row.id),
    list_id: String(row.list_id),
    tmdb_id: Number(row.tmdb_id),
    title: String(row.title),
    year: row.year == null ? null : Number(row.year),
    poster_path: (row.poster_path as string | null) ?? null,
    position: row.position == null ? null : Number(row.position),
    elo: Number(row.elo ?? 1000),
    notes: (row.notes as string | null) ?? null,
    source: (row.source as ListItem["source"]) ?? "manual",
    locked: Boolean(row.locked),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapList(row: Record<string, unknown>): MovieList {
  return {
    id: String(row.id),
    owner_id: String(row.owner_id),
    title: String(row.title),
    slug: String(row.slug),
    description: (row.description as string | null) ?? null,
    target_size: Number(row.target_size),
    visibility: row.visibility as ListVisibility,
    allow_overflow: Boolean(row.allow_overflow),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

let authCache: { at: number; value: AuthContext } | null = null;
const AUTH_CACHE_MS = 30_000;

export function invalidateAuthCache() {
  authCache = null;
}

export async function resolveAuth(): Promise<AuthContext> {
  if (!isSupabaseConfigured()) {
    return { cloud: false, userId: null, profile: null };
  }
  if (authCache && Date.now() - authCache.at < AUTH_CACHE_MS) {
    return authCache.value;
  }
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      authCache = {
        at: Date.now(),
        value: { cloud: false, userId: null, profile: null },
      };
      return authCache.value;
    }
    const profile = await ensureProfile(user.id, user.email ?? undefined);
    authCache = {
      at: Date.now(),
      value: { cloud: true, userId: user.id, profile },
    };
    return authCache.value;
  } catch {
    return { cloud: false, userId: null, profile: null };
  }
}

async function ensureProfile(userId: string, email?: string): Promise<Profile> {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (existing) return existing as Profile;

  const base =
    (email?.split("@")[0] || "user")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 18) || "user";
  const usernameBase = base.length >= 3 ? base : `user_${userId.slice(0, 6)}`;

  for (let i = 0; i < 8; i++) {
    const username = i === 0 ? usernameBase : `${usernameBase}${i}`;
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        username,
        display_name: email?.split("@")[0] || username,
      })
      .select("*")
      .single();
    if (!error && data) return data as Profile;
  }
  throw new Error("Could not create profile");
}

async function persistCloudItems(listId: string, items: ListItem[]) {
  const supabase = createClient();
  const { data: existing, error: existingError } = await supabase
    .from("list_items")
    .select("id")
    .eq("list_id", listId);
  if (existingError) throw existingError;

  const keep = new Set(items.map((i) => i.id));
  const toDelete = (existing ?? [])
    .map((e) => e.id as string)
    .filter((id) => !keep.has(id));
  if (toDelete.length) {
    const { error } = await supabase.from("list_items").delete().in("id", toDelete);
    if (error) throw error;
  }

  if (items.length) {
    const now = new Date().toISOString();
    const { error } = await supabase.from("list_items").upsert(
      items.map((i) => ({
        id: i.id,
        list_id: listId,
        tmdb_id: i.tmdb_id,
        title: i.title,
        year: i.year,
        poster_path: i.poster_path,
        position: i.position,
        elo: i.elo,
        notes: i.notes,
        source: i.source,
        locked: i.locked,
        created_at: i.created_at || now,
        updated_at: now,
      })),
    );
    if (error) throw error;
  }

  await supabase
    .from("lists")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", listId);
}

export async function fetchLists(): Promise<{
  lists: MovieList[];
  cloud: boolean;
  profile: Profile | null;
  localListCount: number;
}> {
  const localListCount = getLocalLists().length;
  const auth = await resolveAuth();
  if (!auth.cloud || !auth.userId) {
    return {
      lists: getLocalLists(),
      cloud: false,
      profile: null,
      localListCount,
    };
  }

  const supabase = createClient();
  let { data, error } = await supabase
    .from("lists")
    .select("*")
    .eq("owner_id", auth.userId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);

  // If cloud is empty but this browser still has local lists, import them
  // (also retries if an earlier failed sync left a bad "migrated" flag).
  if (!(data ?? []).length && localListCount > 0) {
    clearMigrationFlag(auth.userId);
    await migrateLocalListsToCloud(auth.userId, { force: true });
    ({ data, error } = await supabase
      .from("lists")
      .select("*")
      .eq("owner_id", auth.userId)
      .order("updated_at", { ascending: false }));
    if (error) throw new Error(error.message);
  } else {
    await migrateLocalListsToCloud(auth.userId);
  }

  return {
    lists: (data ?? []).map((row) => mapList(row as Record<string, unknown>)),
    cloud: true,
    profile: auth.profile,
    localListCount,
  };
}

function migrationFlagKey(userId: string) {
  return `movieranker.migrated.${userId}`;
}

export function clearMigrationFlag(userId: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(migrationFlagKey(userId));
}

export function countLocalLists() {
  return getLocalLists().length;
}

/**
 * Push browser-local lists into the signed-in cloud account.
 * Returns how many lists were imported.
 */
export async function migrateLocalListsToCloud(
  userId?: string,
  options?: { force?: boolean },
): Promise<number> {
  const auth = userId
    ? { userId, cloud: true as const }
    : await resolveAuth();
  if (!auth.cloud || !auth.userId) {
    throw new Error("Sign in to restore lists to the cloud");
  }

  const flagKey = migrationFlagKey(auth.userId);
  if (typeof window === "undefined") return 0;
  if (!options?.force && localStorage.getItem(flagKey) === "1") return 0;

  const localLists = getLocalLists();
  if (!localLists.length) {
    localStorage.setItem(flagKey, "1");
    return 0;
  }

  const supabase = createClient();
  const { count, error: countError } = await supabase
    .from("lists")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", auth.userId);
  if (countError) throw new Error(countError.message);

  // Only auto-skip when cloud already has data and this isn't a forced restore
  if (!options?.force && (count ?? 0) > 0) {
    localStorage.setItem(flagKey, "1");
    return 0;
  }

  let imported = 0;
  const errors: string[] = [];

  for (const list of localLists) {
    const { data: created, error } = await supabase
      .from("lists")
      .insert({
        owner_id: auth.userId,
        title: list.title,
        slug: `${list.slug}-${nanoid(4)}`.slice(0, 48),
        description: list.description,
        target_size: list.target_size,
        visibility: list.visibility === "private" ? "private" : list.visibility,
        allow_overflow: list.allow_overflow,
      })
      .select("*")
      .single();
    if (error || !created) {
      errors.push(error?.message || `Failed to import ${list.title}`);
      continue;
    }

    const items = getLocalItems(list.id);
    if (items.length) {
      const { error: itemsError } = await supabase.from("list_items").insert(
        items.map((i) => ({
          list_id: created.id,
          tmdb_id: i.tmdb_id,
          title: i.title,
          year: i.year,
          poster_path: i.poster_path,
          position: i.position,
          elo: i.elo,
          notes: i.notes,
          source: i.source,
          locked: i.locked,
        })),
      );
      if (itemsError) {
        errors.push(`${list.title}: ${itemsError.message}`);
      }
    }
    imported += 1;
  }

  if (imported > 0) {
    localStorage.setItem(flagKey, "1");
    clearLocalListsData();
  } else if (errors.length) {
    throw new Error(errors[0]);
  }

  return imported;
}

/** Settings / recovery: force import local browser lists into cloud. */
export async function restoreLocalListsToCloud() {
  const auth = await resolveAuth();
  if (!auth.userId) throw new Error("Sign in first");
  clearMigrationFlag(auth.userId);
  return migrateLocalListsToCloud(auth.userId, { force: true });
}

export type ListBackup = {
  version: 1;
  exportedAt: string;
  lists: Array<{
    list: Omit<MovieList, "id" | "owner_id" | "created_at" | "updated_at"> & {
      title: string;
      slug: string;
    };
    items: Array<{
      tmdb_id: number;
      title: string;
      year: number | null;
      poster_path: string | null;
      position: number | null;
      elo: number;
      notes: string | null;
      source: ListItem["source"];
      locked: boolean;
    }>;
  }>;
};

/** Downloadable backup of this browser’s local lists (works offline / cross-device). */
export function exportLocalBackup(): ListBackup {
  const lists = getLocalLists();
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    lists: lists.map((list) => ({
      list: {
        title: list.title,
        slug: list.slug,
        description: list.description,
        target_size: list.target_size,
        visibility: list.visibility,
        allow_overflow: list.allow_overflow,
      },
      items: getLocalItems(list.id).map((i) => ({
        tmdb_id: i.tmdb_id,
        title: i.title,
        year: i.year,
        poster_path: i.poster_path,
        position: i.position,
        elo: i.elo,
        notes: i.notes,
        source: i.source,
        locked: i.locked,
      })),
    })),
  };
}

/** Import a backup JSON into the signed-in cloud account. */
export async function importBackupToCloud(backup: ListBackup): Promise<number> {
  const auth = await resolveAuth();
  if (!auth.cloud || !auth.userId) {
    throw new Error("Sign in first, then import the backup");
  }
  if (!backup?.lists?.length) {
    throw new Error("Backup has no lists");
  }

  const supabase = createClient();
  let imported = 0;

  for (const entry of backup.lists) {
    const { data: created, error } = await supabase
      .from("lists")
      .insert({
        owner_id: auth.userId,
        title: entry.list.title,
        slug: `${slugify(entry.list.title)}-${nanoid(4)}`.slice(0, 48),
        description: entry.list.description ?? null,
        target_size: entry.list.target_size || 25,
        visibility: entry.list.visibility || "unlisted",
        allow_overflow: entry.list.allow_overflow ?? true,
      })
      .select("*")
      .single();
    if (error || !created) {
      throw new Error(error?.message || `Failed to import ${entry.list.title}`);
    }

    if (entry.items?.length) {
      const { error: itemsError } = await supabase.from("list_items").insert(
        entry.items.map((i) => ({
          list_id: created.id,
          tmdb_id: i.tmdb_id,
          title: i.title,
          year: i.year,
          poster_path: i.poster_path,
          position: i.position,
          elo: i.elo ?? 1000,
          notes: i.notes,
          source: i.source || "manual",
          locked: i.locked ?? false,
        })),
      );
      if (itemsError) throw new Error(itemsError.message);
    }
    imported += 1;
  }

  if (imported > 0) {
    clearLocalListsData();
  }

  return imported;
}

export async function fetchListBundle(listId: string): Promise<{
  list: MovieList | null;
  items: ListItem[];
  cloud: boolean;
  profile: Profile | null;
}> {
  const auth = await resolveAuth();
  if (!auth.cloud) {
    return {
      list: getLocalList(listId),
      items: getLocalItems(listId),
      cloud: false,
      profile: null,
    };
  }

  const supabase = createClient();
  const { data: list, error } = await supabase
    .from("lists")
    .select("*")
    .eq("id", listId)
    .maybeSingle();
  if (error) throw error;
  if (!list) return { list: null, items: [], cloud: true, profile: auth.profile };

  const { data: items, error: itemsError } = await supabase
    .from("list_items")
    .select("*")
    .eq("list_id", listId);
  if (itemsError) throw itemsError;

  return {
    list: mapList(list as Record<string, unknown>),
    items: (items ?? []).map((row) => mapItem(row as Record<string, unknown>)),
    cloud: true,
    profile: auth.profile,
  };
}

export async function createList(input: {
  title: string;
  target_size: number;
  description?: string;
  visibility?: ListVisibility;
}): Promise<MovieList> {
  const auth = await resolveAuth();
  if (!auth.cloud || !auth.userId) {
    throw new Error("Sign in to create and sync lists across devices");
  }

  const supabase = createClient();
  let slug = slugify(input.title);
  for (let i = 0; i < 5; i++) {
    const trySlug = i === 0 ? slug : `${slug}-${nanoid(4)}`;
    const { data, error } = await supabase
      .from("lists")
      .insert({
        owner_id: auth.userId,
        title: input.title,
        slug: trySlug,
        description: input.description ?? null,
        target_size: input.target_size,
        visibility: input.visibility ?? "unlisted",
        allow_overflow: true,
      })
      .select("*")
      .single();
    if (!error && data) return mapList(data as Record<string, unknown>);
  }
  throw new Error("Could not create list");
}

export async function removeList(listId: string) {
  const auth = await resolveAuth();
  if (!auth.cloud) {
    deleteLocalList(listId);
    return;
  }
  const supabase = createClient();
  const { error } = await supabase.from("lists").delete().eq("id", listId);
  if (error) throw error;
}

export async function patchList(listId: string, patch: Partial<MovieList>) {
  const auth = await resolveAuth();
  if (!auth.cloud) {
    return updateLocalList(listId, patch);
  }
  const supabase = createClient();
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.visibility !== undefined) update.visibility = patch.visibility;
  if (patch.target_size !== undefined) update.target_size = patch.target_size;
  if (patch.allow_overflow !== undefined)
    update.allow_overflow = patch.allow_overflow;
  if (patch.slug !== undefined) update.slug = patch.slug;

  const { data, error } = await supabase
    .from("lists")
    .update(update)
    .eq("id", listId)
    .select("*")
    .single();
  if (error) throw error;
  return mapList(data as Record<string, unknown>);
}

export async function ensureInviteLink(
  listId: string,
): Promise<string | null> {
  const auth = await resolveAuth();
  if (!auth.cloud || !auth.userId) {
    return `/invite/${listId}`;
  }
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("invites")
    .select("token")
    .eq("list_id", listId)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();
  if (existing?.token) return `/invite/${existing.token}`;

  const token = nanoid(24);
  const { error } = await supabase.from("invites").insert({
    list_id: listId,
    token,
    created_by: auth.userId,
    role: "viewer",
  });
  if (error) throw error;
  return `/invite/${token}`;
}

function requireCloud(auth: AuthContext): asserts auth is AuthContext & {
  cloud: true;
  userId: string;
} {
  if (!auth.cloud || !auth.userId) {
    throw new Error("Sign in required — lists are cloud-only");
  }
}

async function touchList(listId: string) {
  const supabase = createClient();
  await supabase
    .from("lists")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", listId);
}

/** Patch only rows whose position changed (incl. ranked ↔ bench). */
async function syncChangedPositions(
  previous: ListItem[],
  next: ListItem[],
) {
  const prevById = new Map(previous.map((i) => [i.id, i]));
  const changed = next.filter((item) => {
    const prev = prevById.get(item.id);
    if (!prev) return false;
    return prev.position !== item.position;
  });
  if (!changed.length) return;

  const supabase = createClient();
  const now = new Date().toISOString();
  await Promise.all(
    changed.map((i) =>
      supabase
        .from("list_items")
        .update({ position: i.position, updated_at: now })
        .eq("id", i.id),
    ),
  );
}

export async function addMovie(
  listId: string,
  movie: {
    tmdb_id: number;
    title: string;
    year: number | null;
    poster_path: string | null;
    source?: ListItem["source"];
    elo?: number;
    asBench?: boolean;
    /** Optimistic client id — avoids a second round-trip remap */
    id?: string;
    /** Optimistic position when caller already knows ranked count */
    position?: number | null;
  },
) {
  const auth = await resolveAuth();
  if (!auth.cloud) {
    if (isSupabaseConfigured()) requireCloud(auth);
    return addLocalMovie(listId, movie);
  }

  const supabase = createClient();
  const now = new Date().toISOString();
  const id = movie.id ?? crypto.randomUUID();

  let position: number | null;
  if (movie.asBench) {
    position = null;
  } else if (movie.position !== undefined) {
    position = movie.position;
  } else {
    const { data: top } = await supabase
      .from("list_items")
      .select("position")
      .eq("list_id", listId)
      .not("position", "is", null)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    position = Number(top?.position ?? 0) + 1;
  }

  const row = {
    id,
    list_id: listId,
    tmdb_id: movie.tmdb_id,
    title: movie.title,
    year: movie.year,
    poster_path: movie.poster_path,
    position,
    elo: movie.elo ?? 1000,
    notes: null,
    source: movie.source ?? "manual",
    locked: false,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("list_items")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Already on this list");
    throw new Error(error.message);
  }

  void touchList(listId);
  return mapItem(data as Record<string, unknown>);
}

/**
 * Persist a client-computed reorder. Prefer previous+next so only shifted
 * positions are written (no full-list rewrite).
 */
export async function reorderRanked(
  listId: string,
  orderedIds: string[],
  nextItems?: ListItem[],
  previousItems?: ListItem[],
) {
  const auth = await resolveAuth();
  if (!auth.cloud) {
    reorderLocalRanked(listId, orderedIds);
    return;
  }
  if (nextItems && previousItems) {
    await syncChangedPositions(previousItems, nextItems);
    void touchList(listId);
    return;
  }
  if (nextItems) {
    // Legacy: no previous snapshot — write all ranked positions
    const supabase = createClient();
    const now = new Date().toISOString();
    const ranked = nextItems.filter((i) => i.position != null);
    await Promise.all(
      ranked.map((i) =>
        supabase
          .from("list_items")
          .update({ position: i.position, updated_at: now })
          .eq("id", i.id),
      ),
    );
    void touchList(listId);
    return;
  }
  const { items } = await fetchListBundle(listId);
  const byId = new Map(items.map((i) => [i.id, i]));
  const ranked = orderedIds
    .map((id, index) => {
      const item = byId.get(id);
      if (!item) return null;
      return { ...item, position: index + 1, updated_at: new Date().toISOString() };
    })
    .filter(Boolean) as ListItem[];
  const bench = items.filter((i) => !orderedIds.includes(i.id));
  await persistCloudItems(listId, [...ranked, ...bench]);
}

export async function moveToBench(
  listId: string,
  itemId: string,
  nextItems?: ListItem[],
  previousItems?: ListItem[],
) {
  const auth = await resolveAuth();
  if (!auth.cloud) {
    moveLocalToBench(listId, itemId);
    return;
  }
  if (nextItems && previousItems) {
    await syncChangedPositions(previousItems, nextItems);
    void touchList(listId);
    return;
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("list_items")
    .update({ position: null, updated_at: new Date().toISOString() })
    .eq("id", itemId);
  if (error) throw new Error(error.message);
  if (nextItems) await syncChangedPositions([], nextItems);
  void touchList(listId);
}

export async function removeItem(
  listId: string,
  itemId: string,
  nextItems?: ListItem[],
  previousItems?: ListItem[],
) {
  const auth = await resolveAuth();
  if (!auth.cloud) {
    const items = getLocalItems(listId).filter((i) => i.id !== itemId);
    const ranked = items
      .filter((i) => i.position != null)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((row, index) => ({ ...row, position: index + 1 }));
    const bench = items.filter((i) => i.position == null);
    saveLocalItems(listId, [...ranked, ...bench]);
    return;
  }
  const supabase = createClient();
  const { error } = await supabase.from("list_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
  if (nextItems && previousItems) {
    const prevWithout = previousItems.filter((i) => i.id !== itemId);
    await syncChangedPositions(prevWithout, nextItems);
  } else if (nextItems) {
    await syncChangedPositions([], nextItems);
  }
  void touchList(listId);
}

export async function promoteItem(
  listId: string,
  itemId: string,
  nextPosition?: number,
) {
  const auth = await resolveAuth();
  if (!auth.cloud) {
    const items = getLocalItems(listId);
    const next = items.map((i) =>
      i.id === itemId
        ? {
            ...i,
            position: items.filter((x) => x.position != null).length + 1,
          }
        : i,
    );
    saveLocalItems(listId, next);
    return;
  }
  const supabase = createClient();
  let position = nextPosition;
  if (position == null) {
    const { data: top } = await supabase
      .from("list_items")
      .select("position")
      .eq("list_id", listId)
      .not("position", "is", null)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    position = Number(top?.position ?? 0) + 1;
  }
  const { error } = await supabase
    .from("list_items")
    .update({ position, updated_at: new Date().toISOString() })
    .eq("id", itemId);
  if (error) throw new Error(error.message);
  void touchList(listId);
}

export type BattleOutcome = {
  items: ListItem[];
  winnerElo: number;
  loserElo: number;
  eloWinnerBefore: number;
  eloLoserBefore: number;
};

/** Pure Elo + reorder — no network. Use for instant battle UI. */
export function computeBattleOutcome(
  items: ListItem[],
  winnerId: string,
  loserId: string,
  draw = false,
): BattleOutcome {
  const winner = items.find((i) => i.id === winnerId);
  const loser = items.find((i) => i.id === loserId);
  if (!winner || !loser) throw new Error("Items missing");

  const next = eloPair(winner.elo, loser.elo, draw);
  const updated = items.map((i) => {
    if (i.id === winnerId)
      return { ...i, elo: next.winner, position: i.position ?? 999 };
    if (i.id === loserId)
      return { ...i, elo: next.loser, position: i.position ?? 999 };
    return i;
  });

  const ranked = reindexPositions(
    sortByEloThenPosition(
      updated.filter(
        (i) => i.position != null || i.id === winnerId || i.id === loserId,
      ),
    ),
  );
  const benchOnly = updated.filter(
    (i) => i.position == null && i.id !== winnerId && i.id !== loserId,
  );
  const merged = [
    ...ranked,
    ...benchOnly.map((i) => ({ ...i, position: null as number | null })),
  ];

  return {
    items: merged,
    winnerElo: next.winner,
    loserElo: next.loser,
    eloWinnerBefore: winner.elo,
    eloLoserBefore: loser.elo,
  };
}

/** Persist a battle already computed client-side (background-friendly). */
export async function persistBattleOutcome(
  listId: string,
  winnerId: string,
  loserId: string,
  draw: boolean,
  outcome: BattleOutcome,
  previousItems: ListItem[],
) {
  const auth = await resolveAuth();
  if (!auth.cloud || !auth.userId) {
    applyLocalBattle(listId, winnerId, loserId, draw);
    return;
  }

  const supabase = createClient();
  const now = new Date().toISOString();
  const prevById = new Map(previousItems.map((i) => [i.id, i]));
  const byId = new Map(outcome.items.map((i) => [i.id, i]));

  const winner = byId.get(winnerId);
  const loser = byId.get(loserId);
  if (!winner || !loser) throw new Error("Items missing");

  // Critical path: only the two fighters (elo + their new positions).
  // Remaining rank reshuffles go out fire-and-forget so rapid taps stay light.
  await Promise.all([
    supabase
      .from("list_items")
      .update({
        elo: winner.elo,
        position: winner.position,
        updated_at: now,
      })
      .eq("id", winnerId),
    supabase
      .from("list_items")
      .update({
        elo: loser.elo,
        position: loser.position,
        updated_at: now,
      })
      .eq("id", loserId),
  ]);

  const cascade = outcome.items.filter((item) => {
    if (item.id === winnerId || item.id === loserId) return false;
    const prev = prevById.get(item.id);
    if (!prev) return false;
    return prev.position !== item.position;
  });

  if (cascade.length) {
    void Promise.all(
      cascade.map((item) =>
        supabase
          .from("list_items")
          .update({
            position: item.position,
            updated_at: now,
          })
          .eq("id", item.id),
      ),
    );
  }

  void touchList(listId);
  void supabase.from("battles").insert({
    list_id: listId,
    user_id: auth.userId,
    winner_item_id: winnerId,
    loser_item_id: loserId,
    is_draw: draw,
    elo_winner_before: outcome.eloWinnerBefore,
    elo_winner_after: outcome.winnerElo,
    elo_loser_before: outcome.eloLoserBefore,
    elo_loser_after: outcome.loserElo,
  });
}

export async function applyBattle(
  listId: string,
  winnerId: string,
  loserId: string,
  draw = false,
  currentItems?: ListItem[],
) {
  const auth = await resolveAuth();
  if (!auth.cloud || !auth.userId) {
    const result = applyLocalBattle(listId, winnerId, loserId, draw);
    return {
      ...result,
      items: getLocalItems(listId),
    };
  }

  const items = currentItems ?? (await fetchListBundle(listId)).items;
  const outcome = computeBattleOutcome(items, winnerId, loserId, draw);
  await persistBattleOutcome(
    listId,
    winnerId,
    loserId,
    draw,
    outcome,
    items,
  );
  return {
    winnerElo: outcome.winnerElo,
    loserElo: outcome.loserElo,
    items: outcome.items,
  };
}

export async function seedLetterboxd(
  listId: string,
  rows: {
    name: string;
    year: number | null;
    rating: number | null;
    tmdb_id: number;
    poster_path: string | null;
    title: string;
  }[],
  mode: "bench" | "prefill" | "both",
) {
  const auth = await resolveAuth();
  if (!auth.cloud) {
    seedFromLetterboxdLocal(listId, rows, mode);
    return;
  }

  for (const row of rows) {
    try {
      await addMovie(listId, {
        tmdb_id: row.tmdb_id,
        title: row.title || row.name,
        year: row.year,
        poster_path: row.poster_path,
        source: "letterboxd",
        elo: row.rating != null ? eloFromLetterboxdStars(row.rating) : 1000,
        asBench: mode === "bench",
      });
    } catch {
      /* duplicate */
    }
  }

  if (mode === "prefill" || mode === "both") {
    const { items } = await fetchListBundle(listId);
    const sorted = reindexPositions(sortByEloThenPosition(items));
    await persistCloudItems(listId, sorted);
  }
}

export async function fetchSharedList(
  username: string,
  slug: string,
): Promise<{ list: MovieList | null; items: ListItem[]; ownerName: string }> {
  if (!isSupabaseConfigured()) {
    return { list: null, items: [], ownerName: username };
  }
  const supabase = createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("username", username)
    .maybeSingle();
  if (!profile) return { list: null, items: [], ownerName: username };

  const { data: list } = await supabase
    .from("lists")
    .select("*")
    .eq("owner_id", profile.id)
    .eq("slug", slug)
    .maybeSingle();
  if (!list) return { list: null, items: [], ownerName: username };
  if (list.visibility === "private" || list.visibility === "invite") {
    return { list: null, items: [], ownerName: username };
  }

  const { data: items } = await supabase
    .from("list_items")
    .select("*")
    .eq("list_id", list.id)
    .not("position", "is", null)
    .order("position", { ascending: true });

  return {
    list: mapList(list as Record<string, unknown>),
    items: (items ?? []).map((row) => mapItem(row as Record<string, unknown>)),
    ownerName: profile.display_name || profile.username || username,
  };
}

export async function fetchInviteList(token: string): Promise<{
  list: MovieList | null;
  items: ListItem[];
}> {
  if (!isSupabaseConfigured()) {
    const list = getLocalList(token);
    if (!list || list.visibility !== "invite") {
      return { list: null, items: [] };
    }
    return {
      list,
      items: getLocalItems(token)
        .filter((i) => i.position != null)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    };
  }

  const supabase = createClient();
  const { data: invite } = await supabase
    .from("invites")
    .select("list_id, revoked_at, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!invite || invite.revoked_at) return { list: null, items: [] };
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { list: null, items: [] };
  }

  const { data: list } = await supabase
    .from("lists")
    .select("*")
    .eq("id", invite.list_id)
    .maybeSingle();
  if (!list) return { list: null, items: [] };

  const { data: items } = await supabase
    .from("list_items")
    .select("*")
    .eq("list_id", list.id)
    .not("position", "is", null)
    .order("position", { ascending: true });

  return {
    list: mapList(list as Record<string, unknown>),
    items: (items ?? []).map((row) => mapItem(row as Record<string, unknown>)),
  };
}

export function localFallbackUsername() {
  return getLocalProfile().username;
}
