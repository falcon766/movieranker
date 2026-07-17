"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Poster } from "@/components/ui/Poster";
import type { ListItem } from "@/types/database";

function SortableRow({
  item,
  onRemove,
}: {
  item: ListItem;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`glass flex items-center gap-3 rounded-2xl p-2.5 ${
        isDragging ? "z-10 opacity-90 ring-1 ring-amber/40" : ""
      }`}
    >
      <button
        type="button"
        className="cursor-grab px-1 text-bone/30 active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <span className="rank-badge w-8 text-center text-lg">
        {item.position}
      </span>
      <div className="relative h-16 w-11 shrink-0">
        <Poster
          path={item.poster_path}
          title={item.title}
          className="h-16 w-11"
          sizes="44px"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{item.title}</div>
        <div className="text-sm text-bone/40">
          {item.year || "—"}
          <span className="mx-2 opacity-40">·</span>
          Elo {Math.round(item.elo)}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        className="rounded-full px-2 py-1 text-xs text-bone/35 hover:bg-white/5 hover:text-ember"
      >
        Remove
      </button>
    </li>
  );
}

export function RankList({
  items,
  onReorder,
  onRemove,
}: {
  items: ListItem[];
  onReorder: (orderedIds: string[]) => void;
  onRemove: (id: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ranked = items
    .filter((i) => i.position != null)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ranked.findIndex((i) => i.id === active.id);
    const newIndex = ranked.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(ranked, oldIndex, newIndex);
    onReorder(next.map((i) => i.id));
  }

  if (!ranked.length) {
    return (
      <div className="glass rounded-3xl px-6 py-12 text-center text-bone/45">
        Search a movie to start your ranking.
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={ranked.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="space-y-2">
          {ranked.map((item) => (
            <SortableRow key={item.id} item={item} onRemove={onRemove} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
