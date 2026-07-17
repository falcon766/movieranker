"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BattleArena } from "@/components/battle/BattleArena";
import { applyBattle, fetchListBundle } from "@/lib/lists/store";
import type { ListItem, MovieList } from "@/types/database";

function pickPair(items: ListItem[]): [ListItem, ListItem] | null {
  const pool = items;
  if (pool.length < 2) return null;

  const ranked = [...items]
    .filter((i) => i.position != null)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  if (ranked.length >= 2) {
    const start = Math.floor(Math.random() * (ranked.length - 1));
    if (Math.random() > 0.35) {
      return [ranked[start], ranked[start + 1]];
    }
  }

  const a = pool[Math.floor(Math.random() * pool.length)];
  let b = pool[Math.floor(Math.random() * pool.length)];
  let guard = 0;
  while (b.id === a.id && guard < 10) {
    b = pool[Math.floor(Math.random() * pool.length)];
    guard += 1;
  }
  if (a.id === b.id) return null;
  return [a, b];
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

  const refresh = useCallback(async () => {
    const bundle = await fetchListBundle(listId);
    setList(bundle.list);
    setItems(bundle.items);
    return bundle.items;
  }, [listId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const next = await refresh();
      if (!cancelled) {
        setPair(pickPair(next));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const canBattle = useMemo(() => items.length >= 2, [items.length]);

  function nextRound(updated: ListItem[]) {
    setRound((r) => r + 1);
    setPair(pickPair(updated));
  }

  async function onPick(winnerId: string, loserId: string) {
    const result = await applyBattle(listId, winnerId, loserId, false);
    const updated = await refresh();
    setFlash(
      `Elo → winner ${Math.round(result.winnerElo)} · loser ${Math.round(result.loserElo)}`,
    );
    nextRound(updated);
  }

  async function onDraw() {
    if (!pair) return;
    await applyBattle(listId, pair[0].id, pair[1].id, true);
    const updated = await refresh();
    setFlash("Draw — small Elo nudge");
    nextRound(updated);
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
            onPick={(w, l) => void onPick(w, l)}
            onDraw={() => void onDraw()}
            round={round}
          />
        </>
      )}
    </main>
  );
}
