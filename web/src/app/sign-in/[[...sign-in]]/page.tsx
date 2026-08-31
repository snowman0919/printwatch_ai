import { SignIn } from "@clerk/nextjs";
import { Camera } from "lucide-react";

export default function SignInPage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <div className="grid w-full max-w-5xl gap-12 lg:grid-cols-[1fr_auto] lg:items-center">
        <section className="max-w-xl">
          <div className="mb-8 flex h-11 w-11 items-center justify-center rounded-control border border-border bg-chrome text-primary"><Camera aria-hidden="true" size={22} /></div>
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-primary">DIMIGO FAB LAB · LIVE OPS</p>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">출력 상태를<br />놓치지 마세요.</h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-muted">실시간 영상, 완료 판정, 스파게티 감지를 한 화면에서 확인합니다. 초대된 학교 Google 계정만 접근할 수 있습니다.</p>
        </section>
        <SignIn routing="path" path="/sign-in" withSignUp={false} />
      </div>
    </main>
  );
}
