"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
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
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName || email.split("@")[0] },
        },
      });
      if (authError) throw authError;
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative z-[1] mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-16">
      <Link href="/" className="display text-2xl">
        MovieRanker
      </Link>
      <h1 className="display mt-8 text-4xl">Create your account</h1>
      <p className="mt-2 text-bone/50">
        {configured
          ? "Save lists across devices."
          : "Supabase isn’t configured — jump into local demo mode."}
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {configured && (
          <>
            <input
              className="field"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
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
              placeholder="Password (6+ chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </>
        )}
        {error && <p className="text-sm text-ember">{error}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? "Creating…" : configured ? "Sign up" : "Enter demo"}
        </button>
      </form>

      <p className="mt-6 text-sm text-bone/45">
        Already have an account?{" "}
        <Link href="/login" className="text-amber hover:underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
