"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BattleArena } from "@/components/battle/BattleArena";
import { posterUrl } from "@/lib/config";
import {
  computeBattleOutcome,
  fetchListBundle,
  persistBattleOutcome,
  resolveAuth,
} from "@/lib/lists/store";
import type { ListItem, MovieList } from "@/types/database";

function pickPair(
  items: ListItem[],
  avoid?: [ListItem, ListItem] | null,
): [ListItem, ListItem] | null {
  const pool = items;
  if (pool.length < 2) return null;

  const ranked = [...items]
    .filter((i) => i.position != null)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const avoidKey =
    avoid != null
      ? [avoid[0].id, avoid[1].id].sort().join(":")
      : null;

  const tryAdjacent = (): [ListItem, ListItem] | null => {
    if (ranked.length < 2) return null;
    const start = Math.floor(Math.random() * (ranked.length - 1));
    return [ranked[start], ranked[start + 1]];
  };

  const tryRandom = (): [ListItem, ListItem] | null => {
    const a = pool[Math.floor(Math.random() * pool.length)];
    let b = pool[Math.floor(Math.random() * pool.length)];
    let guard = 0;
    while (b.id === a.id && guard < 10) {
      b = pool[Math.floor(Math.random() * pool.length)];
      guard += 1;
    }
    if (a.id === b.id) return null;
    return [a, b];
  };

  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate =
      ranked.length >= 2 && Math.random() > 0.35
        ? tryAdjacent()
        : tryRandom();
    if (!candidate) continue;
    const key = [candidate[0].id, candidate[1].id].sort().join(":");
    if (avoidKey && key === avoidKey && pool.length > 2) continue;
    return candidate;
  }

  return tryRandom();
}

function prefetchPosters(items: ListItem[]) {
  if (typeof window === "undefined") return;
  for (const item of items) {
    const src = posterUrl(item.poster_path, "w342");
    if (!src) continue;
    const img = new window.Image();
    img.decoding = "async";
    img.src = src;
  }
}

export default function BattlePage() {
  const params = useParams<{ listId: string }>();
  const listId = params.listId;
  const [list, setList] = useState<MovieList | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [pair, setPair] = useState<[ListItem, ListItem] | null>(null);
  const [round, setRound] = useState(1);
  const [flash, setFlash] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const itemsRef = useRef<ListItem[]>([]);
  const pairRef = useRef<[ListItem, ListItem] | null>(null);
  const nextPairRef = useRef<[ListItem, ListItem] | null>(null);
  const busyRef = useRef(false);
  const persistChain = useRef(Promise.resolve());

  const refresh = useCallback(async () => {
    const bundle = await fetchListBundle(listId);
    setList(bundle.list);
    setItems(bundle.items);
    itemsRef.current = bundle.items;
    return bundle.items;
  }, [listId]);

  useEffect(() => {
    // Warm auth cache so the first persist doesn't wait on getUser/profile
    void resolveAuth();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const next = await refresh();
        if (!cancelled) {
          const first = pickPair(next);
          pairRef.current = first;
          setPair(first);
          if (first) prefetchPosters(first);
          const primed = pickPair(next, first);
          nextPairRef.current = primed;
          if (primed) prefetchPosters(primed);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load battle");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const canBattle = useMemo(() => items.length >= 2, [items.length]);

  function runBattle(winnerId: string, loserId: string, draw: boolean) {
    if (busyRef.current) return;
    busyRef.current = true;

    try {
      const previous = itemsRef.current;
      const outcome = computeBattleOutcome(
        previous,
        winnerId,
        loserId,
        draw,
      );

      itemsRef.current = outcome.items;
      setItems(outcome.items);
      setFlash(
        draw
          ? "Draw — small Elo nudge"
          : `Elo → winner ${Math.round(outcome.winnerElo)} · loser ${Math.round(outcome.loserElo)}`,
      );
      setRound((r) => r + 1);

      // Prefer a prefetched pair so posters are often already warm
      let upcoming = nextPairRef.current;
      if (
        !upcoming ||
        !outcome.items.some((i) => i.id === upcoming![0].id) ||
        !outcome.items.some((i) => i.id === upcoming![1].id)
      ) {
        upcoming = pickPair(outcome.items, pairRef.current);
      } else {
        // Refresh elo/position from latest items for the prefetched pair
        const left = outcome.items.find((i) => i.id === upcoming![0].id)!;
        const right = outcome.items.find((i) => i.id === upcoming![1].id)!;
        upcoming = [left, right];
      }

      pairRef.current = upcoming;
      setPair(upcoming);

      const primed = pickPair(outcome.items, upcoming);
      nextPairRef.current = primed;
      if (primed) prefetchPosters(primed);

      persistChain.current = persistChain.current
        .then(() =>
          persistBattleOutcome(
            listId,
            winnerId,
            loserId,
            draw,
            outcome,
            previous,
          ),
        )
        .catch(async () => {
          setError("Couldn’t save that battle — reloading…");
          const next = await refresh();
          const first = pickPair(next);
          pairRef.current = first;
          setPair(first);
          nextPairRef.current = pickPair(next, first);
        });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Battle failed");
    } finally {
      busyRef.current = false;
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center text-bone/40">
        Loading battle…
      </main>
    );
  }

  if (!list) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="display text-3xl">List not found</h1>
        <Link href="/app" className="btn btn-primary mt-6">
          Dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <div className="mb-8 flex items-center justify-between gap-3">
        <Link
          href={`/app/lists/${listId}`}
          className="text-sm text-bone/40 hover:text-bone"
        >
          ← Back to {list.title}
        </Link>
        <span className="text-xs uppercase tracking-[0.2em] text-bone/30">
          Auto-reorder by Elo
        </span>
      </div>

      {error && (
        <p className="mb-4 text-center text-sm text-ember">{error}</p>
      )}

      {!canBattle || !pair ? (
        <div className="glass rounded-[2rem] px-6 py-16 text-center">
          <h1 className="display text-3xl">Need at least two movies</h1>
          <p className="mt-3 text-bone/50">
            Add a few titles, then come back to battle.
          </p>
          <Link href={`/app/lists/${listId}`} className="btn btn-primary mt-8">
            Add movies
          </Link>
        </div>
      ) : (
        <>
          {flash && (
            <p className="mb-6 text-center text-sm text-amber">{flash}</p>
          )}
          <BattleArena
            left={pair[0]}
            right={pair[1]}
            onPick={(w, l) => runBattle(w, l, false)}
            onDraw={() => runBattle(pair[0].id, pair[1].id, true)}
            round={round}
          />
        </>
      )}
    </main>
  );
}
