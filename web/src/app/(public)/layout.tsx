import Link from "next/link";

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground sm:py-16">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <Link href="/about" className="text-sm font-semibold tracking-tight">PrintWatch · DIMIGO</Link>
          <nav aria-label="공개 문서" className="flex gap-4 text-xs text-muted">
            <Link href="/about" className="hover:text-foreground">서비스 소개</Link>
            <Link href="/privacy" className="hover:text-foreground">개인정보처리방침</Link>
            <Link href="/terms" className="hover:text-foreground">이용약관</Link>
          </nav>
        </header>
        {children}
      </div>
    </main>
  );
}
