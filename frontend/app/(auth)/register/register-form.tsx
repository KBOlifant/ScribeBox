"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AnimatePresence } from "motion/react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/app/configs/firebaseconfig";
import { Presence } from "@/components/motion";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { authErrorMessage } from "@/lib/auth-errors";
import {
  emailError,
  focusFirstInvalid,
  hasErrors,
  nameError,
  newPasswordError,
  PASSWORD_MIN,
  type FieldErrors,
} from "@/lib/validation";

type Field = "name" | "email" | "password";

export function RegisterForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const next: FieldErrors<Field> = {
      name: nameError(name),
      email: emailError(email),
      password: newPasswordError(password),
    };
    setErrors(next);
    setFormError(undefined);
    if (hasErrors(next)) {
      focusFirstInvalid(form);
      return;
    }
    setSubmitting(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName: name });
      router.push("/meetings");
    } catch (error) {
      setSubmitting(false);
      setFormError(authErrorMessage(error));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-display">Create an account</h1>
        <p className="mt-1 text-ink-muted">Your meetings and action items are private to you.</p>
      </div>
      <AnimatePresence initial={false}>
        {formError && (
          <Presence key="form-error">
            <Alert tone="error" title={formError} />
          </Presence>
        )}
      </AnimatePresence>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <TextField label="Name" name="name" autoComplete="name" error={errors.name} />
        <TextField label="Email address" name="email" type="email" autoComplete="email" error={errors.email} />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          hint={"At least " + PASSWORD_MIN + " characters. A short sentence works well."}
          error={errors.password}
        />
        <Button type="submit" variant="primary" loading={submitting} className="mt-2 w-full">
          Create account
        </Button>
      </form>
      <p className="text-center text-label font-normal text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="rounded-sm font-[550] text-link underline underline-offset-2 focus-ring">
          Log in
        </Link>
      </p>
    </div>
  );
}
