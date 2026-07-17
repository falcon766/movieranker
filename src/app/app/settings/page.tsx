"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { isSupabaseConfigured, isTmdbConfigured } from "@/lib/config";
import {
  countLocalLists,
  exportLocalBackup,
  importBackupToCloud,
  restoreLocalListsToCloud,
  type ListBackup,
} from "@/lib/lists/store";

export default function SettingsPage() {
  const supabaseConfigured = isSupabaseConfigured();
  const tmdb = isTmdbConfigured();
  const [localCount, setLocalCount] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalCount(countLocalLists());
  }, []);

  async function restore() {
    setBusy(true);
    setStatus(null);
    try {
      const imported = await restoreLocalListsToCloud();
      setStatus(
        imported > 0
          ? `Restored ${imported} list${imported === 1 ? "" : "s"} to your account. Open Lists on any device.`
          : "No local lists found in this browser to restore.",
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setBusy(false);
    }
  }

  function downloadBackup() {
    const backup = exportLocalBackup();
    if (!backup.lists.length) {
      setStatus("No local lists in this browser to export.");
      return;
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `movieranker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus(
      `Exported ${backup.lists.length} list${backup.lists.length === 1 ? "" : "s"}. AirDrop/email the file, then Import on the other device while signed in.`,
    );
  }

  async function onImportFile(file: File) {
    setBusy(true);
    setStatus(null);
    try {
      const text = await file.text();
      const backup = JSON.parse(text) as ListBackup;
      const imported = await importBackupToCloud(backup);
      setStatus(
        `Imported ${imported} list${imported === 1 ? "" : "s"} into your account. Open Lists.`,
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
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
          <h2 className="display text-2xl text-bone">
            Move a list between devices
          </h2>
          <p className="mt-2 text-sm">
            Older lists live in the browser that created them. The web cannot see
            your phone’s storage until you push them up.
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
            <li>
              On <strong className="text-bone">phone</strong> (where the list
              is): sign in with Google → Settings
            </li>
            <li>
              Tap <strong className="text-bone">Restore to cloud</strong>{" "}
              <em>or</em> <strong className="text-bone">Export backup</strong>
            </li>
            <li>
              On web: refresh Lists — or Import the backup file while signed in
            </li>
          </ol>

          <p className="mt-4 text-xs text-bone/40">
            Local lists found in <em>this</em> browser: {localCount}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || localCount === 0}
              onClick={() => void restore()}
            >
              {busy ? "Working…" : "Restore to cloud"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={localCount === 0}
              onClick={downloadBackup}
            >
              Export backup
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              Import backup
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onImportFile(file);
              }}
            />
          </div>
          {status && <p className="mt-3 text-sm text-amber">{status}</p>}
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
              <span className={supabaseConfigured ? "text-sage" : "text-ember"}>
                {supabaseConfigured ? "Connected" : "Missing keys"}
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
