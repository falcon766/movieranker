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
          <h2 className="display text-2xl text-bone">Google sign-in</h2>
          <p className="mt-2 text-sm">
            Enable Google in Supabase (Authentication → Providers → Google) and
            add your Google Cloud OAuth Client ID + Secret. Authorized redirect
            URI must be:
          </p>
          <code className="mt-2 block break-all rounded-xl bg-black/30 px-3 py-2 text-xs text-amber">
            https://ujfuywajcxpkfvemiast.supabase.co/auth/v1/callback
          </code>
          <p className="mt-2 text-sm">
            Also allow{" "}
            <code className="text-amber">http://localhost:3000/auth/callback</code>{" "}
            and your Vercel{" "}
            <code className="text-amber">…/auth/callback</code> in Supabase
            Redirect URLs.
          </p>
        </section>

        <section>
          <h2 className="display text-2xl text-bone">Lists storage</h2>
          <p className="mt-2 text-sm">
            When you&apos;re signed in, lists sync to Supabase across devices.
            The first time you sign in on a device that already had local lists
            (and your cloud account is empty), those local lists are imported
            once automatically.
          </p>
        </section>

        <Link href="/app" className="btn btn-primary">
          Back to lists
        </Link>
      </div>
    </main>
  );
}
