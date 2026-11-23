"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

type FieldProps = {
  label: string;
  /** Shown under the control when there is no error. */
  hint?: ReactNode;
  /** Validation message. Sets aria-invalid and replaces the hint. */
  error?: string;
  /** Appends "(optional)" to the label. */
  optional?: boolean;
  className?: string;
};

const CONTROL =
  "w-full rounded-md border bg-paper-raised px-3 py-2 text-body text-ink placeholder:text-ink-muted transition-colors duration-120 ease-out focus:outline-hidden read-only:bg-paper-sunk";

function controlState(error?: string): string {
  return error
    ? "border-danger focus:shadow-focus-danger"
    : "border-line-strong hover:border-ink-muted focus:border-accent focus:shadow-focus";
}

function describedBy(id: string, error?: string, hint?: ReactNode): string | undefined {
  if (error) return id + "-error";
  if (hint) return id + "-hint";
}

function FieldFrame({ id, label, hint, error, optional, className, children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-label text-ink">
        {label}
        {optional && <span className="font-normal text-ink-muted"> (optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={id + "-error"} className="flex items-start gap-1 text-label font-medium text-danger">
          <Icon name="alert" className="mt-px" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={id + "-hint"} className="text-caption text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type TextFieldProps = FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, "className">;

export function TextField({ label, hint, error, optional, className, id, ...rest }: TextFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldFrame id={fieldId} label={label} hint={hint} error={error} optional={optional} className={className}>
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        className={cn(CONTROL, "min-h-10", controlState(error))}
        {...rest}
      />
    </FieldFrame>
  );
}

type TextAreaFieldProps = FieldProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & {
    /** transcript: mono, for raw transcripts. prose: serif, for summaries. */
    variant?: "transcript" | "prose";
  };

export function TextAreaField({ label, hint, error, optional, className, id, variant = "transcript", ...rest }: TextAreaFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldFrame id={fieldId} label={label} hint={hint} error={error} optional={optional} className={className}>
      <textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        className={cn(
          CONTROL,
          "min-h-40 resize-y",
          variant === "transcript" ? "font-mono text-transcript" : "font-serif text-summary",
          controlState(error),
        )}
        {...rest}
      />
    </FieldFrame>
  );
}
