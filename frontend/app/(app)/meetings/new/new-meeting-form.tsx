"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { TextAreaField, TextField } from "@/components/ui/text-field";
import { TranscriptDrop } from "@/components/ui/transcript-drop";
import { plural } from "@/lib/format";
import { api, ApiRequestError, todayIso, type MeetingRow } from "@/lib/api";
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

// Today's date comes from the browser (the user's time zone). The server render has no date,
// so the field fills in on hydration without a mismatch
const subscribeNever = () => () => {};
function useToday(): string {
  return useSyncExternalStore(subscribeNever, todayIso, () => "");
}

export function NewMeetingForm() {
  const router = useRouter();
  const today = useToday();
  const [title, setTitle] = useState("");
  // null until the user edits the date, so it shows today's date by default
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const date = pickedDate ?? today;
  const [file, setFile] = useState<{ name: string; size: number; meta: string } | null>(null);
  const [transcript, setTranscript] = useState("");
  const [errors, setErrors] = useState<FieldErrors<Field>>({});
  const [submitting, setSubmitting] = useState(false);
  // State only updates on the next render, so a fast double click could slip past it; the ref can't
  const submittingRef = useRef(false);
  // Set once the meeting is saved, so trying again after a failed navigation doesn't save it twice
  const [savedId, setSavedId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function onFile(chosen: File) {
    const fileError = transcriptFileError(chosen);
    if (fileError) {
      setErrors((prev) => ({ ...prev, file: fileError }));
      return;
    }
    let text: string;
    try {
      text = await chosen.text();
    } catch {
      setErrors((prev) => ({ ...prev, file: "That file couldn’t be read. Try choosing it again, or paste the transcript instead." }));
      return;
    }
    setFile({ name: chosen.name, size: chosen.size, meta: describeTranscript(text, chosen.name) });
    setTranscript(text);
    setErrors((prev) => ({ ...prev, file: undefined, transcript: undefined }));
    // Read the title as it is now: the user may have typed one while the file was loading
    setTitle((current) => (current.trim() ? current : titleFromFileName(chosen.name)));
  }

  function clearFile() {
    setFile(null);
    setTranscript("");
  }

  // Saves the meeting and returns its id, or shows why it didn't save and returns null
  async function save(form: HTMLFormElement): Promise<string | null> {
    try {
      const { meeting } = await api<{ meeting: MeetingRow }>("/api/meetings", {
        method: "POST",
        body: { title, date, transcript, ...(file ? { sourceName: file.name } : {}) },
      });
      setSavedId(meeting.id);
      return meeting.id;
    } catch (caught) {
      const failure = caught instanceof ApiRequestError ? caught : new ApiRequestError(0, "Something went wrong. Try again.");
      const fields = failure.fields;
      if (failure.status === 422 && fields && (fields.title || fields.date || fields.transcript)) {
        setErrors({ title: fields.title, date: fields.date, transcript: fields.transcript });
        focusFirstInvalid(form);
      } else {
        setFormError(failure.message);
      }
      return null;
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const form = event.currentTarget;
    const next = meetingErrors({ title, date, transcript });
    setErrors(next);
    if (hasErrors(next)) {
      focusFirstInvalid(form);
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setFormError(null);
    const id = savedId ?? (await save(form));
    if (!id) {
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }

    // The transcript is saved. The meeting page starts the analysis (?analyse=1) once it has
    // loaded, so it shows the run from the start instead of racing it
    try {
      router.push("/meetings/" + encodeURIComponent(id) + "?analyse=1");
    } catch {
      submittingRef.current = false;
      setSubmitting(false);
      setFormError("Your transcript is saved. Try again to open it, or find it under Meetings.");
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="surface flex flex-col gap-6 p-5 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
        <TextField
          label="Meeting title"
          name="title"
          placeholder="e.g. Sprint planning"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          error={errors.title}
        />
        <TextField label="Date" name="date" type="date" value={date} onChange={(event) => setPickedDate(event.target.value)} error={errors.date} />
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
        error={errors.transcript}
      />

      {formError && (
        <Alert tone="error" title={savedId ? "The meeting page didn’t open" : "Couldn’t save the transcript"}>
          {formError}
        </Alert>
      )}

      <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
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
