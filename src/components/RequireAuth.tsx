"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/config";
import { resolveAuth } from "@/lib/lists/store";

/** Client-side guard in case middleware cookies aren't ready yet. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(!isSupabaseConfigured());

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const auth = await resolveAuth();
      if (cancelled) return;
      if (!auth.cloud) {
        router.replace("/login?next=/app");
        return;
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="px-4 py-20 text-center text-bone/40">Checking session…</div>
    );
  }

  return children;
}
