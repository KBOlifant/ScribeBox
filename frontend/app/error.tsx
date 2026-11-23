"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center gap-4 px-4">
      <h1 className="text-display">Something went wrong</h1>
      <p className="text-ink-muted">This page couldn’t load. Anything you already saved is safe.</p>
      <div>
        <Button variant="primary" icon="refresh" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
