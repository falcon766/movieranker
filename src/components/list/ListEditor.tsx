"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MovieSearch, type SearchDestination } from "@/components/MovieSearch";
import { Bench } from "@/components/list/Bench";
import { RankList } from "@/components/list/RankList";
import {
  addLocalMovie,
  getLocalItems,
  getLocalList,
  moveLocalToBench,
  reorderLocalRanked,
  saveLocalItems,
  updateLocalList,
} from "@/lib/local-store";
import type { ListItem, ListVisibility, MovieList, TmdbMovie } from "@/types/database";

export function ListEditor({ listId }: { listId: string }) {
  const [list, setList] = useState<MovieList | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const refresh = useCallback(() => {
    setList(getLocalList(listId));
    setItems(getLocalItems(listId));
  }, [listId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const excludeIds = useMemo(() => items.map((i) => i.tmdb_id), [items]);
  const rankedCount = items.filter((i) => i.position != null).length;

  async function handleSelect(movie: TmdbMovie, destination: SearchDestination) {
    try {
      addLocalMovie(listId, {
        tmdb_id: movie.id,
        title: movie.title,
        year: movie.release_date
          ? Number.parseInt(movie.release_date.slice(0, 4), 10)
          : null,
        poster_path: movie.poster_path,
        asBench: destination === "bench",
      });
      refresh();
      setMessage(
        destination === "bench"
          ? `${movie.title} sent to the bench`
          : `Added ${movie.title}`,
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not add");
    }
  }

  function handleReorder(orderedIds: string[]) {
    reorderLocalRanked(listId, orderedIds);
    refresh();
  }

  function handleBenchFromRank(id: string) {
    const item = items.find((i) => i.id === id);
    moveLocalToBench(listId, id);
    refresh();
    if (item) setMessage(`${item.title} moved to the bench`);
  }

  function handleRemove(id: string) {
    const item = items.find((i) => i.id === id);
    const next = items.filter((i) => i.id !== id);
    const ranked = next
      .filter((i) => i.position != null)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((row, index) => ({ ...row, position: index + 1 }));
    const bench = next.filter((i) => i.position == null);
    saveLocalItems(listId, [...ranked, ...bench]);
    refresh();
    if (item) setMessage(`${item.title} removed`);
  }

  function promote(id: string) {
    const next = items.map((i) =>
      i.id === id
        ? {
            ...i,
            position: items.filter((x) => x.position != null).length + 1,
          }
        : i,
    );
    saveLocalItems(listId, next);
    refresh();
  }

  function setVisibility(visibility: ListVisibility) {
    updateLocalList(listId, { visibility });
    refresh();
    setMessage(
      visibility === "private"
        ? "List is private"
        : visibility === "invite"
          ? "Invite-only — copy the invite link below"
          : "Share link ready",
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

  const sharePath = `/u/you/${list.slug}?local=${list.id}`;
  const invitePath = `/invite/${list.id}`;

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
                onClick={() => setVisibility(v)}
              >
                {v}
              </button>
            ))}
          </div>
          {(list.visibility === "unlisted" || list.visibility === "public") && (
            <ShareCopy path={sharePath} label="Public / unlisted link" />
          )}
          {list.visibility === "invite" && (
            <ShareCopy path={invitePath} label="Invite link" />
          )}
          <p className="text-xs text-bone/35">
            Local demo mode stores lists in this browser. Cloud sync coming
            next.
          </p>
        </div>
      )}

      <div className="mb-8">
        <MovieSearch excludeIds={excludeIds} onSelect={handleSelect} />
      </div>

      <RankList
        items={items}
        onReorder={handleReorder}
        onBench={handleBenchFromRank}
        onRemove={handleRemove}
      />

      <div className="mt-12">
        <Bench items={items} onPromote={promote} onRemove={handleRemove} />
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/app/import/letterboxd" className="btn btn-ghost">
          Import Letterboxd
        </Link>
      </div>
    </div>
  );
}

function ShareCopy({ path, label }: { path: string; label: string }) {
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
            await navigator.clipboard.writeText(url);
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
