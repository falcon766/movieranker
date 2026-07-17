import { Suspense } from "react";
import { ShareClient } from "./ShareClient";

export default function SharedListPage() {
  return (
    <Suspense
      fallback={
        <main className="relative z-[1] mx-auto max-w-lg px-4 py-20 text-center text-bone/40">
          Loading…
        </main>
      }
    >
      <ShareClient />
    </Suspense>
  );
}
