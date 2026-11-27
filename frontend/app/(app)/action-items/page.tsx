import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { ActionItemsView } from "./action-items-view";
import { ListSkeleton } from "./list-skeleton";

export const metadata: Metadata = { title: "My open action items" };

export default function ActionItemsPage() {
  return (
    <div className="mx-auto flex max-w-[960px] flex-col gap-8">
      <PageHeader title="My open action items" description="Everything assigned in your meetings, in one place." />
      {/* Filters live in the URL query, which needs a Suspense boundary when the page is prerendered.
          The view loads the items itself, in the browser, once the user is signed in. */}
      <Suspense fallback={<ListSkeleton />}>
        <ActionItemsView />
      </Suspense>
    </div>
  );
}
