"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { formatBytes } from "@/lib/format";
import { Button } from "./button";
import { Icon } from "./icon";

type TranscriptDropProps = {
  /** Called with the chosen or dropped file. Validate type and size on the server too. */
  onFile?: (file: File) => void;
  /** When set, shows the chosen file instead of the drop zone. */
  file?: { name: string; size: number; meta?: string } | null;
  onClear?: () => void;
  error?: string;
  accept?: string;
  hint?: string;
};

export function TranscriptDrop({
  onFile,
  file,
  onClear,
  error,
  accept = ".txt,.vtt,.md,text/plain,text/vtt,text/markdown",
  hint = ".txt, .vtt or .md · up to 1 MB",
}: TranscriptDropProps) {
  const [dragging, setDragging] = useState(false);
  const errorId = useId() + "-error";

  function take(list: FileList | null) {
    const chosen = list?.[0];
    if (chosen && onFile) onFile(chosen);
  }

  const errorText = error ? (
    <p id={errorId} className="flex items-start gap-1 text-label font-medium text-danger">
      <Icon name="alert" className="mt-px" />
      <span>{error}</span>
    </p>
  ) : null;

  if (file) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 rounded-lg border border-line-strong bg-paper-raised px-4 py-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-accent-soft text-accent">
            <Icon name="file" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{file.name}</p>
            <p className="text-caption text-ink-muted">{[formatBytes(file.size), file.meta].filter(Boolean).join(" · ")}</p>
          </div>
          {onClear && (
            <Button variant="ghost" size="sm" onClick={onClear} aria-label={"Remove " + file.name}>
              Remove
            </Button>
          )}
        </div>
        {errorText}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          take(event.dataTransfer.files);
        }}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-[1.5px] bg-paper-raised px-6 py-8 text-center",
          "transition-colors duration-120 ease-out focus-within:border-accent focus-within:shadow-focus",
          dragging
            ? "border-solid border-accent bg-accent-soft"
            : error
              ? "border-dashed border-danger"
              : "border-dashed border-line-strong hover:border-accent",
        )}
      >
        <input
          type="file"
          accept={accept}
          className="sr-only"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => {
            take(event.target.files);
            event.target.value = "";
          }}
        />
        <span className="mb-2 grid size-10 place-items-center rounded-md bg-accent-soft text-accent">
          <Icon name="upload" size={20} />
        </span>
        <span className="font-semibold text-ink">
          {dragging ? (
            "Drop to add this transcript"
          ) : (
            <>
              Drop a transcript here or{" "}
              <span className="text-link underline decoration-1 underline-offset-[3px]">choose a file</span>
            </>
          )}
        </span>
        <span className="text-caption text-ink-muted">{hint}</span>
      </label>
      {errorText}
    </div>
  );
}
