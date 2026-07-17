import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { isSupabaseConfigured, isTmdbConfigured } from "@/lib/config";

export default function SettingsPage() {
  const supabase = isSupabaseConfigured();
  const tmdb = isTmdbConfigured();

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
          <LogoutButton
            className="btn btn-ghost mt-4"
            label="Log out"
          />
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
          <h2 className="display text-2xl text-bone">Lists storage</h2>
          <p className="mt-2 text-sm">
            Rankings still save in this browser until we wire cloud sync to your
            Supabase tables. Auth already uses Supabase.
          </p>
        </section>

        <Link href="/app" className="btn btn-primary">
          Back to lists
        </Link>
      </div>
    </main>
  );
}
