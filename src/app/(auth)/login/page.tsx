"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) {
      router.push("/app");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw authError;
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative z-[1] mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-16">
      <Link href="/" className="display text-2xl">
        MovieRanker
      </Link>
      <h1 className="display mt-8 text-4xl">Welcome back</h1>
      <p className="mt-2 text-bone/50">
        {configured
          ? "Sign in to sync your lists."
          : "Supabase isn’t configured yet — continue in local demo mode."}
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {configured && (
          <>
            <input
              className="field"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="field"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </>
        )}
        {error && <p className="text-sm text-ember">{error}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? "Signing in…" : configured ? "Sign in" : "Enter demo"}
        </button>
      </form>

      <p className="mt-6 text-sm text-bone/45">
        No account?{" "}
        <Link href="/signup" className="text-amber hover:underline">
          Sign up
        </Link>
      </p>
    </main>
  );
}
