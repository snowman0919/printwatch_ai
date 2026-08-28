import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const withClerk = clerkMiddleware(async (auth, request) => {
  const path = request.nextUrl.pathname;
  if (path.startsWith("/dashboard") || path.startsWith("/api/app")) await auth.protect();
});

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (process.env.NODE_ENV !== "production" && process.env.AUTH_TEST_MODE === "1") return NextResponse.next();
  return withClerk(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
