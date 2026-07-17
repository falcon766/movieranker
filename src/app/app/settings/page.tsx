"use client";

import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { isSupabaseConfigured, isTmdbConfigured } from "@/lib/config";

export default function SettingsPage() {
  const supabaseConfigured = isSupabaseConfigured();
  const tmdb = isTmdbConfigured();

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <p className="eyebrow">Settings</p>
      <h1 className="display mt-2 text-4xl">Account</h1>

      <div className="glass mt-8 space-y-6 rounded-3xl p-6 text-bone/70">
        <section>
          <h2 className="display text-2xl text-bone">Session</h2>
          <p className="mt-2 text-sm">
            Your lists are saved to your account and stay in sync across
            devices.
          </p>
          <LogoutButton className="btn btn-ghost mt-4" label="Log out" />
        </section>

        <section>
          <h2 className="display text-2xl text-bone">Status</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              Movie data:{" "}
              <span className={tmdb ? "text-sage" : "text-ember"}>
                {tmdb ? "Connected" : "Unavailable"}
              </span>
            </li>
            <li>
              Account sync:{" "}
              <span className={supabaseConfigured ? "text-sage" : "text-ember"}>
                {supabaseConfigured ? "Connected" : "Unavailable"}
              </span>
            </li>
          </ul>
        </section>

        <Link href="/app" className="btn btn-primary">
          Back to lists
        </Link>
      </div>
    </main>
  );
}
