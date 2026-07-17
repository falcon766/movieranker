"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { isSupabaseConfigured } from "@/lib/config";
import { invalidateAuthCache } from "@/lib/lists/store";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({
  className = "rounded-full px-3 py-1.5 text-bone/60 hover:bg-white/5 hover:text-bone",
  label = "Log out",
}: {
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        await supabase.auth.signOut();
        invalidateAuthCache();
      }
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      disabled={loading}
      className={className}
    >
      {loading ? "…" : label}
    </button>
  );
}
