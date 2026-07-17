"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Poster } from "@/components/ui/Poster";
import type { ListItem } from "@/types/database";

export function BattleArena({
  left,
  right,
  onPick,
  onDraw,
  round,
}: {
  left: ListItem;
  right: ListItem;
  onPick: (winnerId: string, loserId: string) => void;
  onDraw: () => void;
  round: number;
}) {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="eyebrow">Battle · Round {round}</p>
        <h1 className="display mt-2 text-3xl sm:text-5xl">Which one stays higher?</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-6">
        <AnimatePresence mode="popLayout">
          {[left, right].map((item, index) => {
            const other = index === 0 ? right : left;
            return (
              <motion.button
                key={`${item.id}-${round}`}
                type="button"
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                onClick={() => onPick(item.id, other.id)}
                className="group glass relative overflow-hidden rounded-[1.6rem] p-3 text-left sm:p-4"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-amber/10 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                <div className="relative mx-auto max-w-[220px]">
                  <Poster
                    path={item.poster_path}
                    title={item.title}
                    priority
                    className="shadow-2xl transition duration-300 group-hover:scale-[1.02]"
                  />
                </div>
                <div className="mt-4 text-center">
                  <div className="display text-xl leading-tight sm:text-2xl">
                    {item.title}
                  </div>
                  <div className="mt-1 text-sm text-bone/45">
                    {item.year || "—"} · Elo {Math.round(item.elo)}
                  </div>
                  <div className="mt-3 text-xs uppercase tracking-[0.2em] text-amber">
                    Tap to win
                  </div>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="flex justify-center">
        <button type="button" className="btn btn-ghost" onClick={onDraw}>
          Too close to call
        </button>
      </div>
    </div>
  );
}
