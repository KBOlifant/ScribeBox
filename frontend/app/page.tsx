import { redirect } from "next/navigation";

// The (app) layout's AuthGate sends signed-out visitors on to /login.
export default function Home() {
  redirect("/meetings");
}
