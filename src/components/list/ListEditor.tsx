"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MovieSearch, type SearchDestination } from "@/components/MovieSearch";
import { Bench } from "@/components/list/Bench";
import { RankList } from "@/components/list/RankList";
import { SuggestionSession } from "@/components/list/SuggestionSession";
import {
  addMovie,
  ensureInviteLink,
  fetchListBundle,
  moveToBench,
  patchList,
  promoteItem,
  removeItem,
  reorderRanked,
} from "@/lib/lists/store";
import type {
  ListItem,
  ListVisibility,
  MovieList,
  Profile,
  TmdbMovie,
} from "@/types/database";

export function ListEditor({ listId }: { listId: string }) {
  const [list, setList] = useState<MovieList | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cloud, setCloud] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [invitePath, setInvitePath] = useState<string | null>(null);
  const itemsRef = useRef<ListItem[]>([]);
  const persistChain = useRef(Promise.resolve());
  const reorderFlush = useRef<{
    previous: ListItem[];
    next: ListItem[];
    orderedIds: string[];
  } | null>(null);
  const reorderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyItems = useCallback((next: ListItem[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const queuePersist = useCallback(
    (task: () => Promise<void>, failMessage: string) => {
      persistChain.current = persistChain.current
        .then(task)
        .catch(async () => {
          setMessage(failMessage);
          const bundle = await fetchListBundle(listId);
          setList(bundle.list);
          applyItems(bundle.items);
          setCloud(bundle.cloud);
          setProfile(bundle.profile);
        });
    },
    [applyItems, listId],
  );

  useEffect(() => {
    return () => {
      if (reorderTimer.current) clearTimeout(reorderTimer.current);
    };
  }, []);

  const refresh = useCallback(async () => {
    const bundle = await fetchListBundle(listId);
    setList(bundle.list);
    applyItems(bundle.items);
    setCloud(bundle.cloud);
    setProfile(bundle.profile);
    return bundle;
  }, [applyItems, listId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await refresh();
      } catch (e) {
        if (!cancelled) {
          setMessage(e instanceof Error ? e.message : "Failed to load list");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const excludeIds = useMemo(() => items.map((i) => i.tmdb_id), [items]);
  const rankedCount = items.filter((i) => i.position != null).length;

  async function handleSelect(
    movie: TmdbMovie,
    destination: SearchDestination,
    source: ListItem["source"] = "manual",
  ) {
    if (itemsRef.current.some((i) => i.tmdb_id === movie.id)) {
      setMessage("Already on this list");
      return;
    }

    const now = new Date().toISOString();
    const ranked = itemsRef.current.filter((i) => i.position != null).length;
    const optimistic: ListItem = {
      id: crypto.randomUUID(),
      list_id: listId,
      tmdb_id: movie.id,
      title: movie.title,
      year: movie.release_date
        ? Number.parseInt(movie.release_date.slice(0, 4), 10)
        : null,
      poster_path: movie.poster_path,
      position: destination === "bench" ? null : ranked + 1,
      elo: 1000,
      notes: null,
      source,
      locked: false,
      created_at: now,
      updated_at: now,
    };

    applyItems([...itemsRef.current, optimistic]);
    setMessage(
      destination === "bench"
        ? `${movie.title} sent to the bench`
        : `Added ${movie.title}`,
    );

    try {
      const saved = await addMovie(listId, {
        id: optimistic.id,
        tmdb_id: movie.id,
        title: movie.title,
        year: optimistic.year,
        poster_path: movie.poster_path,
        asBench: destination === "bench",
        position: optimistic.position,
        source,
      });
      applyItems(
        itemsRef.current.map((i) => (i.id === optimistic.id ? saved : i)),
      );
    } catch (e) {
      applyItems(itemsRef.current.filter((i) => i.id !== optimistic.id));
      setMessage(e instanceof Error ? e.message : "Could not add");
    }
  }

  function handleReorder(orderedIds: string[]) {
    const previous = itemsRef.current;
    const byId = new Map(previous.map((i) => [i.id, i]));
    const ranked = orderedIds
      .map((id, index) => {
        const item = byId.get(id);
        if (!item) return null;
        return { ...item, position: index + 1 };
      })
      .filter(Boolean) as ListItem[];
    const bench = previous.filter((i) => !orderedIds.includes(i.id));
    const next = [...ranked, ...bench];
    applyItems(next);

    // Coalesce rapid drags into one cloud write of the latest order
    const baseline = reorderFlush.current?.previous ?? previous;
    reorderFlush.current = { previous: baseline, next, orderedIds };
    if (reorderTimer.current) clearTimeout(reorderTimer.current);
    reorderTimer.current = setTimeout(() => {
      const snap = reorderFlush.current;
      reorderFlush.current = null;
      reorderTimer.current = null;
      if (!snap) return;
      queuePersist(
        () =>
          reorderRanked(
            listId,
            snap.orderedIds,
            snap.next,
            snap.previous,
          ),
        "Could not reorder — reloading…",
      );
    }, 140);
  }

  function handleBenchFromRank(id: string) {
    const previous = itemsRef.current;
    const item = previous.find((i) => i.id === id);
    const next = previous.map((i) =>
      i.id === id ? { ...i, position: null } : i,
    );
    const ranked = next
      .filter((i) => i.position != null)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((row, index) => ({ ...row, position: index + 1 }));
    const bench = next.filter((i) => i.position == null);
    const merged = [...ranked, ...bench];
    applyItems(merged);
    if (item) setMessage(`${item.title} moved to the bench`);
    queuePersist(
      () => moveToBench(listId, id, merged, previous),
      "Could not bench — reloading…",
    );
  }

  function handleRemove(id: string) {
    const previous = itemsRef.current;
    const item = previous.find((i) => i.id === id);
    const filtered = previous.filter((i) => i.id !== id);
    const ranked = filtered
      .filter((i) => i.position != null)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((row, index) => ({ ...row, position: index + 1 }));
    const bench = filtered.filter((i) => i.position == null);
    const next = [...ranked, ...bench];
    applyItems(next);
    if (item) setMessage(`${item.title} removed`);
    queuePersist(
      () => removeItem(listId, id, next, previous),
      "Could not remove — reloading…",
    );
  }

  function promote(id: string) {
    const previous = itemsRef.current;
    const nextPos = previous.filter((i) => i.position != null).length + 1;
    applyItems(
      previous.map((i) => (i.id === id ? { ...i, position: nextPos } : i)),
    );
    queuePersist(
      () => promoteItem(listId, id, nextPos),
      "Could not rank — reloading…",
    );
  }

  async function setVisibility(visibility: ListVisibility) {
    setList((prev) => (prev ? { ...prev, visibility } : prev));
    try {
      await patchList(listId, { visibility });
      if (visibility === "invite") {
        const path = await ensureInviteLink(listId);
        setInvitePath(path);
      }
      setMessage(
        visibility === "private"
          ? "List is private"
          : visibility === "invite"
            ? "Invite-only — copy the invite link below"
            : cloud
              ? "Synced share link ready"
              : "Share link ready",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not update visibility");
      await refresh();
    }
  }

  if (loading) {
    return (
      <div className="relative z-[1] mx-auto max-w-lg px-4 py-20 text-center text-bone/40">
        Loading list…
      </div>
    );
  }

  if (!list) {
    return (
      <div className="relative z-[1] mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="display text-3xl">List not found</h1>
        <Link href="/app" className="btn btn-primary mt-6">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const username = profile?.username || "you";
  const sharePath = cloud
    ? `/u/${username}/${list.slug}`
    : `/u/you/${list.slug}?local=${list.id}`;
  const inviteSharePath = invitePath || `/invite/${list.id}`;

  return (
    <div className="relative z-[1] mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/app" className="text-sm text-bone/40 hover:text-bone">
            ← Lists
          </Link>
          <h1 className="display mt-2 text-4xl sm:text-5xl">{list.title}</h1>
          <p className="mt-2 text-bone/50">
            <span className="rank-badge">{rankedCount}</span>
            <span className="mx-1">/</span>
            {list.target_size} ranked
            {list.description ? ` · ${list.description}` : ""}
            <span className="mx-2 opacity-40">·</span>
            <span className="text-xs uppercase tracking-wider text-bone/35">
              {cloud ? "Saved to your account" : "Sign in to sync"}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/app/lists/${list.id}/battle`} className="btn btn-ember">
            Battle
          </Link>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShareOpen((v) => !v)}
          >
            Share
          </button>
        </div>
      </div>

      {message && (
        <p className="mb-4 rounded-2xl border border-amber/20 bg-amber/10 px-4 py-3 text-sm text-amber">
          {message}
        </p>
      )}

      {shareOpen && (
        <div className="glass mb-6 space-y-3 rounded-3xl p-5">
          <p className="eyebrow">Visibility</p>
          <div className="flex flex-wrap gap-2">
            {(
              ["private", "unlisted", "public", "invite"] as ListVisibility[]
            ).map((v) => (
              <button
                key={v}
                type="button"
                className={`btn !py-2 !text-sm ${
                  list.visibility === v ? "btn-primary" : "btn-ghost"
                }`}
                onClick={() => void setVisibility(v)}
              >
                {v}
              </button>
            ))}
          </div>
          {(list.visibility === "unlisted" || list.visibility === "public") && (
            <ShareCopy path={sharePath} label="Public / unlisted link" />
          )}
          {list.visibility === "invite" && (
            <ShareCopy
              path={inviteSharePath}
              label="Invite link"
              onNeedPath={async () => {
                const path = await ensureInviteLink(listId);
                if (path) setInvitePath(path);
                return path || inviteSharePath;
              }}
            />
          )}
          <p className="text-xs text-bone/35">
            Lists are saved to your account in the cloud — not on this device.
          </p>
        </div>
      )}

      <div className="mb-8">
        <MovieSearch
          excludeIds={excludeIds}
          onSelect={(movie, destination) => handleSelect(movie, destination)}
        />
      </div>

      <div className="mb-10">
        <SuggestionSession
          items={items}
          onPick={(movie, destination) =>
            handleSelect(movie, destination, "suggestion")
          }
        />
      </div>

      <RankList
        items={items}
        onReorder={handleReorder}
        onBench={handleBenchFromRank}
        onRemove={handleRemove}
      />

      <div className="mt-12">
        <Bench
          items={items}
          onPromote={promote}
          onRemove={handleRemove}
        />
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/app/import/letterboxd" className="btn btn-ghost">
          Import Letterboxd
        </Link>
      </div>
    </div>
  );
}

function ShareCopy({
  path,
  label,
  onNeedPath,
}: {
  path: string;
  label: string;
  onNeedPath?: () => Promise<string>;
}) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState(path);

  useEffect(() => {
    setUrl(`${window.location.origin}${path}`);
  }, [path]);

  return (
    <div>
      <p className="mb-1 text-sm text-bone/50">{label}</p>
      <div className="flex gap-2">
        <input className="field" readOnly value={url} />
        <button
          type="button"
          className="btn btn-primary shrink-0"
          onClick={async () => {
            let next = url;
            if (onNeedPath) {
              const p = await onNeedPath();
              next = `${window.location.origin}${p}`;
              setUrl(next);
            }
            await navigator.clipboard.writeText(next);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
