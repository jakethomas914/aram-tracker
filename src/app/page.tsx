import { Dashboard } from "@/components/aram/dashboard";
import { getDashboardState } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const state = await getDashboardState();
  return <Dashboard initialState={state} />;
}
