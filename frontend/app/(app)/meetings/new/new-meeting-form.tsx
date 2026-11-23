"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { TextAreaField, TextField } from "@/components/ui/text-field";
import { TranscriptDrop } from "@/components/ui/transcript-drop";
import { plural } from "@/lib/format";
import { wait } from "@/lib/mock";
import { focusFirstInvalid, hasErrors, meetingErrors, transcriptFileError, type FieldErrors } from "@/lib/validation";

type Field = "title" | "date" | "transcript" | "file";

function describeTranscript(text: string, fileName: string): string {
  if (fileName.toLowerCase().endsWith(".vtt")) {
    return "VTT · " + plural(text.split("-->").length - 1, "cue");
  }
  return plural(text.split("\n").length, "line");
}

function titleFromFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function NewMeetingForm({ today }: { today: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [file, setFile] = useState<{ name: string; size: number; meta: string } | null>(null);
  const [transcript, setTranscript] = useState("");
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [submitting, setSubmitting] = useState(false);

  async function onFile(chosen: File) {
    const fileError = transcriptFileError(chosen);
    if (fileError) {
      setErrors((prev) => ({ ...prev, file: fileError }));
      return;
    }
    const text = await chosen.text();
    setFile({ name: chosen.name, size: chosen.size, meta: describeTranscript(text, chosen.name) });
    setTranscript(text);
    setErrors((prev) => ({ ...prev, file: undefined, transcript: undefined }));
    if (!title.trim()) setTitle(titleFromFileName(chosen.name));
  }

  function clearFile() {
    setFile(null);
    setTranscript("");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const form = event.currentTarget;
    const next = meetingErrors({ title, date, transcript });
    setErrors(next);
    if (hasErrors(next)) {
      focusFirstInvalid(form);
      return;
    }
    setSubmitting(true);
    await wait(1200);
    // Mock: the new meeting opens in its "analysing" state.
    router.push("/meetings/m-2");
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6 rounded-lg border border-line bg-paper-raised p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
        <TextField
          label="Meeting title"
          name="title"
          placeholder="e.g. Sprint planning"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          error={errors.title}
        />
        <TextField label="Date" name="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} error={errors.date} />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-label">Transcript</span>
        <TranscriptDrop file={file} onFile={onFile} onClear={clearFile} error={errors.file} />
      </div>

      <TextAreaField
        label={file ? "Transcript text" : "Or paste the transcript"}
        name="transcript"
        rows={10}
        value={transcript}
        readOnly={Boolean(file)}
        onChange={(event) => setTranscript(event.target.value)}
        placeholder={"Lerato: Morning everyone. Two things today…\nSipho: Engineering can’t hit the 25th."}
        hint={
          file
            ? "Showing the contents of " + file.name + ". It’s stored exactly as uploaded. Remove the file to paste text instead."
            : "Speaker names help the AI attribute action items. Timestamps are kept if you include them."
        }
        error={errors.transcript}
      />

      <div className="flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[380px] text-caption text-ink-muted">
          Your transcript is saved before analysis starts, so nothing is lost if the AI is slow or unavailable.
        </p>
        <div className="flex flex-row-reverse gap-3 sm:flex-row">
          <ButtonLink href="/meetings" variant="ghost">
            Cancel
          </ButtonLink>
          <Button type="submit" variant="primary" loading={submitting}>
            Analyse transcript
          </Button>
        </div>
      </div>
    </form>
  );
}
