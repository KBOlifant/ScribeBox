"use client";

import { useRouter } from "next/navigation";
import { EmailAuthProvider, deleteUser, reauthenticateWithCredential } from "firebase/auth";
import { useState, type FormEvent } from "react";
import { AnimatePresence } from "motion/react";
import { useAuth } from "@/components/auth-provider";
import { Presence } from "@/components/motion";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { formatLongDate } from "@/lib/format";
import { authErrorMessage } from "@/lib/auth-errors";

export function AccountView() {
  const router = useRouter();
  const { user } = useAuth();
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
    if (!user) return;
    setError(undefined);
    setDeleting(true);
    try {
      // Firebase requires a recent sign-in before deleting, so confirm with the password first.
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email ?? "", password));
      await deleteUser(user);
      router.push("/login");
    } catch (error) {
      setDeleting(false);
      setError(authErrorMessage(error));
    }
  }

  // The (app) layout gate keeps this hidden until a user is signed in.
  if (!user) return null;
  const memberSince = user.metadata.creationTime ? new Date(user.metadata.creationTime).toISOString().slice(0, 10) : undefined;

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="profile" className="surface p-5 sm:p-7">
        <h2 id="profile" className="text-title">
          Profile
        </h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-3">
          <div>
            <dt className="text-label font-normal text-ink-muted">Name</dt>
            <dd className="mt-1">{user.displayName ?? "—"}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-label font-normal text-ink-muted">Email</dt>
            <dd className="mt-1 truncate">{user.email}</dd>
          </div>
          <div>
            <dt className="text-label font-normal text-ink-muted">Member since</dt>
            <dd className="mt-1">{memberSince ? formatLongDate(memberSince) : "—"}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="delete-account" className="surface p-5 sm:p-7">
        <h2 id="delete-account" className="text-title text-danger">
          Delete account
        </h2>
        <p className="mt-2 max-w-[560px] text-ink-muted">
          You’ll be signed out and won’t be able to sign in again. Your meetings, transcripts and action items are hidden from
          everyone. This is a soft delete: the records are kept, not erased.
        </p>

        {/* The button and the confirmation swap in place: the old one leaves before the new one enters. */}
        <AnimatePresence mode="wait" initial={false}>
          {confirming ? (
            <Presence key="confirm" className="mt-6">
              <form noValidate onSubmit={onDelete} className="flex flex-col gap-4">
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
            </Presence>
          ) : (
            <Presence key="button" className="mt-6">
              <Button onClick={() => setConfirming(true)}>Delete account…</Button>
            </Presence>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}
