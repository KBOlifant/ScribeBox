import { redirect } from "next/navigation";

// Mock mode: there is no session yet, so the root always lands on the meetings list.
export default function Home() {
  redirect("/meetings");
}
