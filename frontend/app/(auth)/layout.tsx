import Link from "next/link";
import type { ReactNode } from "react";
import { GuestGate } from "@/components/auth-gate";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Link href="/login" className="mb-8 inline-flex items-center gap-2.5 rounded-sm text-[30px] leading-none font-semibold tracking-[-0.03em] focus-ring">
        <span aria-hidden="true" className="size-3 rounded-full bg-lilac" />
        ScribeBox
      </Link>
      <div className="w-full max-w-[420px] rounded-xl bg-paper-raised p-6 shadow-float sm:p-9">
        <GuestGate>{children}</GuestGate>
      </div>
      <p className="mt-8 max-w-[420px] text-center text-[15px] leading-6 text-ink-muted">
        Turn meeting transcripts into a summary, decisions and action items, traced to what was said.
      </p>
    </main>
  );
}
