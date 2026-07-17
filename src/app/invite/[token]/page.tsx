"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Poster } from "@/components/ui/Poster";
import { getLocalItems, getLocalList } from "@/lib/local-store";
import type { ListItem, MovieList } from "@/types/database";

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const [list, setList] = useState<MovieList | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);

  useEffect(() => {
    const l = getLocalList(params.token);
    if (!l || l.visibility !== "invite") return;
    setList(l);
    setItems(
      getLocalItems(params.token)
        .filter((i) => i.position != null)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    );
  }, [params.token]);

  if (!list) {
    return (
      <main className="relative z-[1] mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="display text-3xl">Invite invalid</h1>
        <p className="mt-3 text-bone/50">
          This invite may be revoked, or the list isn’t invite-only in this
          browser.
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
