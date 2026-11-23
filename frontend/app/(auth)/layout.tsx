import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Link href="/login" className="mb-8 rounded-sm text-[28px] leading-none font-semibold tracking-[-0.03em] focus-ring">
        ScribeBox
      </Link>
      <div className="w-full max-w-[400px] rounded-lg border border-line bg-paper-raised p-6 shadow-card sm:p-8">{children}</div>
      <p className="mt-6 max-w-[400px] text-center text-caption text-ink-muted">
        Turn meeting transcripts into a summary, decisions and action items, traced to what was said.
      </p>
    </main>
  );
}
