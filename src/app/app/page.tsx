"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchLists, removeList } from "@/lib/lists/store";
import type { MovieList } from "@/types/database";

export default function DashboardPage() {
  const [lists, setLists] = useState<MovieList[]>([]);
  const [cloud, setCloud] = useState(false);
  const [localListCount, setLocalListCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchLists();
      setLists(result.lists);
      setCloud(result.cloud);
      setLocalListCount(result.localListCount);
      if (result.cloud && result.localListCount > 0) {
        setNotice(
          result.lists.length
            ? `This browser still has ${result.localListCount} local list(s) not fully synced. On this device open Settings → Restore to cloud.`
            : "Cloud is empty, but this browser still has local lists. Open Settings → Restore to cloud.",
        );
      } else {
        setNotice(null);
      }
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e && "message" in e
            ? String((e as { message: unknown }).message)
            : "Failed to load lists";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your canons</p>
          <h1 className="display mt-2 text-4xl sm:text-5xl">Lists</h1>
          <p className="mt-2 text-sm text-bone/40">
            Cloud-only — same lists on phone and desktop when you&apos;re signed
            in.
          </p>
        </div>
        <Link href="/app/lists/new" className="btn btn-primary">
          New list
        </Link>
      </div>

      {error && (
        <p className="mt-6 rounded-2xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-6 rounded-2xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber">
          {notice}{" "}
          <Link href="/app/settings" className="underline">
            Settings
          </Link>
        </p>
      )}

      {loading ? (
        <p className="mt-12 text-center text-bone/40">Loading lists…</p>
      ) : !lists.length ? (
        <div className="glass mt-12 rounded-[2rem] px-6 py-16 text-center">
          <h2 className="display text-3xl">No lists yet</h2>
          <p className="mx-auto mt-3 max-w-md text-bone/50">
            {cloud && localListCount > 0
              ? "Your account is empty, but this browser may still have older lists."
              : "Start a Top 25 — or go to 100. You can import Letterboxd anytime."}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {cloud && localListCount > 0 && (
              <Link href="/app/settings" className="btn btn-primary">
                Restore local lists
              </Link>
            )}
            <Link href="/app/lists/new" className="btn btn-ghost">
              Create a new list
            </Link>
          </div>
        </div>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {lists.map((list) => (
            <li
              key={list.id}
              className="glass group rounded-3xl p-5 transition hover:border-amber/30"
            >
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
                    void removeList(list.id).then(() => load());
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
