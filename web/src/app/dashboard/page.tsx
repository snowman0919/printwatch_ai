import { connection } from "next/server";
import { requireSchoolUser } from "@/lib/auth";
import { dashboardData } from "@/lib/db";
import { Dashboard } from "@/components/dashboard";

export default async function DashboardPage() {
  await connection();
  const user = await requireSchoolUser({ redirectOnFailure: true });
  return <Dashboard initialPrinters={dashboardData()} user={user} testMode={process.env.NODE_ENV !== "production" && process.env.AUTH_TEST_MODE === "1"} />;
}
