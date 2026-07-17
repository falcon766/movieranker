"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Poster } from "@/components/ui/Poster";
import { fetchInviteList } from "@/lib/lists/store";
import type { ListItem, MovieList } from "@/types/database";

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const [list, setList] = useState<MovieList | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await fetchInviteList(params.token);
        if (!cancelled) {
          setList(result.list);
          setItems(result.items);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.token]);

  if (!ready) {
    return (
      <main className="relative z-[1] mx-auto max-w-lg px-4 py-20 text-center text-bone/40">
        Loading invite…
      </main>
    );
  }

  if (!list) {
    return (
      <main className="relative z-[1] mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="display text-3xl">Invite invalid</h1>
        <p className="mt-3 text-bone/50">
          This invite may be revoked, expired, or incorrect.
        </p>
        <Link href="/" className="btn btn-ghost mt-8">
          Home
        </Link>
      </main>
    );
  }

  return (
    <main className="relative z-[1] mx-auto max-w-3xl px-4 py-12">
      <p className="eyebrow">Invite only</p>
      <h1 className="display mt-3 text-5xl">{list.title}</h1>
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
            <div className="display text-xl">{item.title}</div>
          </li>
        ))}
      </ol>
    </main>
  );
}
