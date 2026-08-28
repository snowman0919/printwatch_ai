import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { hasVerifiedSchoolGoogleAccount } from "./school-domain";

export async function requireSchoolUser(options: { redirectOnFailure?: boolean } = {}) {
  if (process.env.NODE_ENV !== "production" && process.env.AUTH_TEST_MODE === "1") return { id: "local-reviewer", email: "reviewer@dimigo.hs.kr", name: "Local Reviewer" };
  const user = await currentUser();
  const email = user?.emailAddresses.find((entry) => entry.id === user.primaryEmailAddressId)?.emailAddress.toLowerCase();
  if (!user || !email || !hasVerifiedSchoolGoogleAccount(email, user.externalAccounts)) {
    if (options.redirectOnFailure) redirect("/unauthorized");
    throw new Response("Forbidden", { status: 403 });
  }
  return { id: user.id, email, name: user.fullName ?? email.split("@")[0] };
}
