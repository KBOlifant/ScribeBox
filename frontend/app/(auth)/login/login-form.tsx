"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/app/configs/firebaseconfig";
import { authErrorMessage } from "@/lib/auth-errors";
import { emailError, focusFirstInvalid, hasErrors, type FieldErrors } from "@/lib/validation";

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
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/meetings");
    } catch (error) {
      setSubmitting(false);
      setFormError(authErrorMessage(error));
    }
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
      <p className="text-center text-label font-normal text-ink-muted">
        New to ScribeBox?{" "}
        <Link href="/register" className="rounded-sm font-[550] text-link underline underline-offset-2 focus-ring">
          Create an account
        </Link>
      </p>
    </div>
  );
}
