import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center gap-4 px-4">
      <p className="font-mono text-timestamp text-ink-muted">404</p>
      <h1 className="text-display">Page not found</h1>
      <p className="text-ink-muted">
        This page doesn’t exist, or it belongs to another account. Meetings are only visible to the person who added
        them.
      </p>
      <div>
        <ButtonLink href="/meetings" variant="primary">
          Back to meetings
        </ButtonLink>
      </div>
    </main>
  );
}
