"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteLocalList, getLocalLists } from "@/lib/local-store";
import type { MovieList } from "@/types/database";

export default function DashboardPage() {
  const [lists, setLists] = useState<MovieList[]>([]);

  useEffect(() => {
    setLists(getLocalLists());
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your canons</p>
          <h1 className="display mt-2 text-4xl sm:text-5xl">Lists</h1>
        </div>
        <Link href="/app/lists/new" className="btn btn-primary">
          New list
        </Link>
      </div>

      {!lists.length ? (
        <div className="glass mt-12 rounded-[2rem] px-6 py-16 text-center">
          <h2 className="display text-3xl">No lists yet</h2>
          <p className="mx-auto mt-3 max-w-md text-bone/50">
            Start a Top 25 — or go to 100. You can import Letterboxd anytime.
          </p>
          <Link href="/app/lists/new" className="btn btn-primary mt-8">
            Create your first list
          </Link>
        </div>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {lists.map((list) => (
            <li key={list.id} className="glass group rounded-3xl p-5 transition hover:border-amber/30">
              <Link href={`/app/lists/${list.id}`} className="block">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="display text-2xl group-hover:text-amber">
                      {list.title}
                    </h2>
                    <p className="mt-1 text-sm text-bone/45">
                      Target {list.target_size} · {list.visibility}
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-widest text-bone/30">
                    Open
                  </span>
                </div>
              </Link>
              <button
                type="button"
                className="mt-4 text-xs text-bone/30 hover:text-ember"
                onClick={() => {
                  if (confirm("Delete this list?")) {
                    deleteLocalList(list.id);
                    setLists(getLocalLists());
                  }
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
