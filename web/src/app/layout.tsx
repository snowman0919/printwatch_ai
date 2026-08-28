import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrintWatch · DIMIGO",
  description: "세 대의 3D 프린터를 한 화면에서 감시합니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const document = <html lang="ko" className="h-full antialiased"><body className="min-h-full font-sans">{children}</body></html>;
  if (process.env.NODE_ENV !== "production" && process.env.AUTH_TEST_MODE === "1") return document;
  return <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-in">{document}</ClerkProvider>;
}
