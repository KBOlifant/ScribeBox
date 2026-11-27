import { Suspense, type ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { AuthGate } from "@/components/auth-gate";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-paper-raised focus:px-4 focus:py-2 focus:shadow-float"
      >
        Skip to content
      </a>
      {/* The header reads the URL (usePathname), which Next.js needs inside a Suspense boundary */}
      <Suspense fallback={<div aria-hidden="true" className="h-[112px] bg-chrome shadow-chrome sm:h-[68px]" />}>
        <AppHeader />
      </Suspense>
      <main id="main" className="mx-auto w-full max-w-[1120px] flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
      </div>
    </AuthGate>
  );
}
