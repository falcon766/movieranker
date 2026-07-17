"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { isSupabaseConfigured, isTmdbConfigured } from "@/lib/config";
import {
  countLocalLists,
  restoreLocalListsToCloud,
} from "@/lib/lists/store";

export default function SettingsPage() {
  const supabase = isSupabaseConfigured();
  const tmdb = isTmdbConfigured();
  const [localCount, setLocalCount] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLocalCount(countLocalLists());
  }, []);

  async function restore() {
    setBusy(true);
    setStatus(null);
    try {
      const imported = await restoreLocalListsToCloud();
      setLocalCount(countLocalLists());
      setStatus(
        imported > 0
          ? `Restored ${imported} list${imported === 1 ? "" : "s"} to your account. Open Lists to see them.`
          : "No local lists found in this browser to restore.",
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <p className="eyebrow">Settings</p>
      <h1 className="display mt-2 text-4xl">Account & setup</h1>

      <div className="glass mt-8 space-y-6 rounded-3xl p-6 text-bone/70">
        <section>
          <h2 className="display text-2xl text-bone">Session</h2>
          <p className="mt-2 text-sm">
            Sign out of MovieRanker on this device.
          </p>
          <LogoutButton className="btn btn-ghost mt-4" label="Log out" />
        </section>

        <section>
          <h2 className="display text-2xl text-bone">Restore local lists</h2>
          <p className="mt-2 text-sm">
            If cloud sync was empty after the RLS fix, lists may still be in
            this browser. This copies them into your signed-in account.
          </p>
          <p className="mt-2 text-xs text-bone/40">
            Local lists found here: {localCount}
          </p>
          <button
            type="button"
            className="btn btn-primary mt-4"
            disabled={busy || localCount === 0}
            onClick={() => void restore()}
          >
            {busy ? "Restoring…" : "Restore to cloud"}
          </button>
          {status && (
            <p className="mt-3 text-sm text-amber">{status}</p>
          )}
        </section>

        <section>
          <h2 className="display text-2xl text-bone">Connections</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              TMDB:{" "}
              <span className={tmdb ? "text-sage" : "text-ember"}>
                {tmdb ? "Connected" : "Missing key"}
              </span>
            </li>
            <li>
              Supabase:{" "}
              <span className={supabase ? "text-sage" : "text-ember"}>
                {supabase ? "Connected" : "Missing keys"}
              </span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="display text-2xl text-bone">Google sign-in</h2>
          <p className="mt-2 text-sm">
            Enable Google in Supabase (Authentication → Providers → Google) and
            add your Google Cloud OAuth Client ID + Secret. Authorized redirect
            URI must be:
          </p>
          <code className="mt-2 block break-all rounded-xl bg-black/30 px-3 py-2 text-xs text-amber">
            https://ujfuywajcxpkfvemiast.supabase.co/auth/v1/callback
          </code>
        </section>

        <section>
          <h2 className="display text-2xl text-bone">Lists storage</h2>
          <p className="mt-2 text-sm">
            When you&apos;re signed in, lists sync to Supabase across devices.
          </p>
        </section>

        <Link href="/app" className="btn btn-primary">
          Back to lists
        </Link>
      </div>
    </main>
  );
}
