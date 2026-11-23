"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { wait } from "@/lib/mock";
import { currentUser } from "@/lib/mock-data";
import { emailError, focusFirstInvalid, hasErrors, PASSWORD_MIN, type FieldErrors } from "@/lib/validation";

export function LoginForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors<"email" | "password">>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    const next: FieldErrors<"email" | "password"> = { email: emailError(email) };
    if (!password) next.password = "Enter your password.";
    setErrors(next);
    setFormError(undefined);
    if (hasErrors(next)) {
      focusFirstInvalid(form);
      return;
    }

    setSubmitting(true);
    await wait(900);
    // Mock check. The real API answers with one generic message so it never reveals which field was wrong.
    if (email.toLowerCase() !== currentUser.email || password.length < PASSWORD_MIN) {
      setSubmitting(false);
      setFormError("That email or password is incorrect.");
      return;
    }
    router.push("/meetings");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-display">Log in</h1>
        <p className="mt-1 text-ink-muted">Your meetings are where you left them.</p>
      </div>
      {formError && (
        <Alert tone="error" title={formError}>
          Check both and try again.
        </Alert>
      )}
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <TextField label="Email address" name="email" type="email" autoComplete="email" error={errors.email} />
        <TextField label="Password" name="password" type="password" autoComplete="current-password" error={errors.password} />
        <Button type="submit" variant="primary" loading={submitting} className="mt-2 w-full">
          Log in
        </Button>
      </form>
      <p className="text-center text-sm text-ink-muted">
        New to ScribeBox?{" "}
        <Link href="/register" className="rounded-sm font-[550] text-link underline underline-offset-2 focus-ring">
          Create an account
        </Link>
      </p>
      <p className="rounded-md bg-paper-sunk px-3 py-2 text-caption text-ink-muted">
        Mock data: log in as <span className="font-mono">{currentUser.email}</span> with any password of {PASSWORD_MIN} or more
        characters.
      </p>
    </div>
  );
}
