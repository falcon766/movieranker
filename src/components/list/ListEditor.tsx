"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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

  const refresh = useCallback(async () => {
    const bundle = await fetchListBundle(listId);
    setList(bundle.list);
    setItems(bundle.items);
    setCloud(bundle.cloud);
    setProfile(bundle.profile);
    return bundle;
  }, [listId]);

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
    try {
      await addMovie(listId, {
        tmdb_id: movie.id,
        title: movie.title,
        year: movie.release_date
          ? Number.parseInt(movie.release_date.slice(0, 4), 10)
          : null,
        poster_path: movie.poster_path,
        asBench: destination === "bench",
        source,
      });
      await refresh();
      setMessage(
        destination === "bench"
          ? `${movie.title} sent to the bench`
          : `Added ${movie.title}`,
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not add");
    }
  }

  async function handleReorder(orderedIds: string[]) {
    await reorderRanked(listId, orderedIds);
    await refresh();
  }

  async function handleBenchFromRank(id: string) {
    const item = items.find((i) => i.id === id);
    await moveToBench(listId, id);
    await refresh();
    if (item) setMessage(`${item.title} moved to the bench`);
  }

  async function handleRemove(id: string) {
    const item = items.find((i) => i.id === id);
    await removeItem(listId, id);
    await refresh();
    if (item) setMessage(`${item.title} removed`);
  }

  async function promote(id: string) {
    await promoteItem(listId, id);
    await refresh();
  }

  async function setVisibility(visibility: ListVisibility) {
    await patchList(listId, { visibility });
    if (visibility === "invite") {
      const path = await ensureInviteLink(listId);
      setInvitePath(path);
    }
    await refresh();
    setMessage(
      visibility === "private"
        ? "List is private"
        : visibility === "invite"
          ? "Invite-only — copy the invite link below"
          : cloud
            ? "Synced share link ready"
            : "Share link ready",
    );
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
        onReorder={(ids) => void handleReorder(ids)}
        onBench={(id) => void handleBenchFromRank(id)}
        onRemove={(id) => void handleRemove(id)}
      />

      <div className="mt-12">
        <Bench
          items={items}
          onPromote={(id) => void promote(id)}
          onRemove={(id) => void handleRemove(id)}
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
