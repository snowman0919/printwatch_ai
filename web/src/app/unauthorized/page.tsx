import { SignOutButton } from "@clerk/nextjs";

export default function UnauthorizedPage() {
  return <main className="grid min-h-screen place-items-center px-6"><div className="max-w-md rounded-panel border border-border bg-surface p-8"><p className="font-mono text-xs text-danger">ACCESS DENIED</p><h1 className="mt-3 text-2xl font-semibold">학교 계정이 필요합니다</h1><p className="mt-3 text-muted">초대된 @dimigo.hs.kr Google 계정으로 다시 로그인하세요.</p><SignOutButton><button className="mt-8 h-11 rounded-control bg-primary px-5 font-medium text-primary-foreground">다른 계정으로 로그인</button></SignOutButton></div></main>;
}
