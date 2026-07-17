"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createLocalList } from "@/lib/local-store";

const PRESETS = [25, 50, 75, 100];

export default function NewListPage() {
  const router = useRouter();
  const [title, setTitle] = useState("Best movies of all time");
  const [target, setTarget] = useState(25);
  const [custom, setCustom] = useState("");
  const [description, setDescription] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const size = custom ? Number.parseInt(custom, 10) : target;
    if (!Number.isFinite(size) || size < 1 || size > 250) return;
    const list = createLocalList({
      title: title.trim() || "Untitled list",
      target_size: size,
      description: description.trim() || undefined,
      visibility: "unlisted",
    });
    router.push(`/app/lists/${list.id}`);
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <p className="eyebrow">New list</p>
      <h1 className="display mt-2 text-4xl">Name it anything</h1>
      <p className="mt-2 text-bone/50">
        Best of all time, favorites, comfort canon — your call.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div>
          <label className="mb-2 block text-sm text-bone/50">Title</label>
          <input
            className="field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Favorite movies all time"
            required
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-bone/50">
            Target size
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                className={`btn !py-2 !text-sm ${
                  !custom && target === n ? "btn-primary" : "btn-ghost"
                }`}
                onClick={() => {
                  setTarget(n);
                  setCustom("");
                }}
              >
                Top {n}
              </button>
            ))}
          </div>
          <input
            className="field mt-3"
            type="number"
            min={1}
            max={250}
            placeholder="Custom size (1–250)"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm text-bone/50">
            Description (optional)
          </label>
          <textarea
            className="field min-h-24"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="The films I’d defend at dinner."
          />
        </div>
        <button type="submit" className="btn btn-primary w-full">
          Create list
        </button>
      </form>
    </main>
  );
}
