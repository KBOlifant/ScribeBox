import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { actionItems, currentUser } from "@/lib/mock-data";

export default function AppLayout({ children }: { children: ReactNode }) {
  const openCount = actionItems.filter((item) => item.status !== "done").length;
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-paper-raised focus:px-4 focus:py-2 focus:shadow-float"
      >
        Skip to content
      </a>
      <AppHeader userName={currentUser.name} openCount={openCount} />
      <main id="main" className="mx-auto w-full max-w-[1120px] flex-1 px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
    </div>
  );
}
