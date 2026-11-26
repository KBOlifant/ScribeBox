import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { AccountView } from "./account-view";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-8">
      <PageHeader title="Account" />
      <AccountView />
    </div>
  );
}
