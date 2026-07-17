"use client";

import { Poster } from "@/components/ui/Poster";
import type { ListItem } from "@/types/database";

export function Bench({
  items,
  onPromote,
  onRemove,
}: {
  items: ListItem[];
  onPromote: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const bench = items.filter((i) => i.position == null);

  if (!bench.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="eyebrow">Bench</p>
          <h2 className="display text-2xl">Candidates</h2>
        </div>
        <p className="text-sm text-bone/40">{bench.length} waiting</p>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {bench.map((item) => (
          <li key={item.id} className="glass rounded-2xl p-2">
            <div className="relative mb-2">
              <Poster path={item.poster_path} title={item.title} />
            </div>
            <div className="truncate text-sm font-medium">{item.title}</div>
            <div className="mb-2 text-xs text-bone/40">{item.year || "—"}</div>
            <div className="flex gap-1">
              <button
                type="button"
                className="btn btn-primary flex-1 !rounded-xl !px-2 !py-1.5 text-xs"
                onClick={() => onPromote(item.id)}
              >
                Rank it
              </button>
              <button
                type="button"
                className="btn btn-ghost !rounded-xl !px-2 !py-1.5 text-xs"
                onClick={() => onRemove(item.id)}
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
