import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Dashboard } from "./dashboard";

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses[0]?.emailAddress || "";
  return <Dashboard email={email} />;
}
