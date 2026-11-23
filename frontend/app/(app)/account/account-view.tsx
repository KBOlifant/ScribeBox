"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { formatLongDate } from "@/lib/format";
import { wait } from "@/lib/mock";
import type { User } from "@/lib/types";

export function AccountView({ user }: { user: User }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [deleting, setDeleting] = useState(false);

  async function onDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (deleting) return;
    if (!password) {
      setError("Enter your password to confirm.");
      return;
    }
    setError(undefined);
    setDeleting(true);
    await wait(1000);
    router.push("/login");
  }

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="profile" className="rounded-lg border border-line bg-paper-raised p-4 sm:p-6">
        <h2 id="profile" className="text-title">
          Profile
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-caption text-ink-muted">Name</dt>
            <dd className="mt-1">{user.name}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-caption text-ink-muted">Email</dt>
            <dd className="mt-1 truncate">{user.email}</dd>
          </div>
          <div>
            <dt className="text-caption text-ink-muted">Member since</dt>
            <dd className="mt-1">{formatLongDate(user.memberSince)}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="delete-account" className="rounded-lg border border-danger bg-paper-raised p-4 sm:p-6">
        <h2 id="delete-account" className="text-title">
          Delete account
        </h2>
        <p className="mt-2 max-w-[560px] text-ink-muted">
          You’ll be signed out and won’t be able to sign in again. Your meetings, transcripts and action items are hidden from
          everyone. This is a soft delete: the records are kept, not erased.
        </p>

        {confirming ? (
          <form noValidate onSubmit={onDelete} className="mt-6 flex flex-col gap-4">
            <Alert tone="info" title="Are you sure?">
              This can’t be undone from inside ScribeBox.
            </Alert>
            <TextField
              label="Your password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={error}
              className="max-w-[400px]"
            />
            <div className="flex flex-wrap gap-3">
              <Button type="submit" variant="danger" loading={deleting}>
                Delete account
              </Button>
              <Button
                variant="ghost"
                disabled={deleting}
                onClick={() => {
                  setConfirming(false);
                  setPassword("");
                  setError(undefined);
                }}
              >
                Keep my account
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-6">
            <Button onClick={() => setConfirming(true)}>Delete account…</Button>
          </div>
        )}
      </section>
    </div>
  );
}
