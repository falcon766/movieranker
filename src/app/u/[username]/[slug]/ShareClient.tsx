"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Poster } from "@/components/ui/Poster";
import { fetchSharedList } from "@/lib/lists/store";
import { getLocalItems, getLocalList } from "@/lib/local-store";
import type { ListItem, MovieList } from "@/types/database";

export function ShareClient() {
  const params = useParams<{ username: string; slug: string }>();
  const search = useSearchParams();
  const localId = search.get("local");
  const [list, setList] = useState<MovieList | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [ownerName, setOwnerName] = useState(params.username);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (localId) {
        const l = getLocalList(localId);
        if (l && l.visibility !== "private" && l.visibility !== "invite") {
          if (!cancelled) {
            setList(l);
            setItems(
              getLocalItems(localId)
                .filter((i) => i.position != null)
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
            );
            setOwnerName(params.username);
          }
        }
        if (!cancelled) setReady(true);
        return;
      }

      try {
        const shared = await fetchSharedList(params.username, params.slug);
        if (!cancelled) {
          setList(shared.list);
          setItems(shared.items);
          setOwnerName(shared.ownerName);
        }
      } catch {
        if (!cancelled) setList(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [localId, params.username, params.slug]);

  if (!ready) {
    return (
      <main className="relative z-[1] mx-auto max-w-lg px-4 py-20 text-center text-bone/40">
        Loading…
      </main>
    );
  }

  if (!list) {
    return (
      <main className="relative z-[1] mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="display text-3xl">List unavailable</h1>
        <p className="mt-3 text-bone/50">
          Private, invite-only, or not found.
        </p>
        <Link href="/app" className="btn btn-primary mt-8">
          Open app
        </Link>
      </main>
    );
  }

  return (
    <main className="relative z-[1] mx-auto max-w-3xl px-4 py-12">
      <p className="eyebrow">
        {ownerName}&apos;s list · Top {list.target_size}
      </p>
      <h1 className="display mt-3 text-5xl">{list.title}</h1>
      {list.description && (
        <p className="mt-3 max-w-xl text-bone/55">{list.description}</p>
      )}

      <ol className="mt-12 space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="glass flex items-center gap-4 rounded-2xl p-3"
          >
            <span className="rank-badge w-10 text-center text-2xl">
              {item.position}
            </span>
            <div className="relative h-20 w-14 shrink-0">
              <Poster
                path={item.poster_path}
                title={item.title}
                className="h-20 w-14"
                sizes="56px"
              />
            </div>
            <div>
              <div className="display text-xl">{item.title}</div>
              <div className="text-sm text-bone/40">{item.year || "—"}</div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-12 text-center">
        <Link href="/app" className="btn btn-primary">
          Make your own
        </Link>
      </div>
    </main>
  );
}
