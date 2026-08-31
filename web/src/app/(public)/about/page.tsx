import Link from "next/link";

export default function AboutPage() {
  return (
    <article className="space-y-8">
      <div>
        <p className="font-mono text-xs tracking-[0.14em] text-primary">PRINT MONITORING</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">PrintWatch AI</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">한국디지털미디어고등학교의 Ender-3 V3 SE 세 대를 원격으로 확인하는 내부 모니터링 서비스입니다. 카메라 장면, 프린터 텔레메트리와 AI 판정 근거를 한 화면에 표시합니다.</p>
      </div>
      <section className="rounded-panel border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">접근 정책</h2>
        <p className="mt-3 text-sm leading-7 text-muted">관리자가 초대한 <span className="text-foreground">@dimigo.hs.kr</span> Google 계정만 사용할 수 있습니다. AI 판정은 작업자의 확인을 돕는 정보이며 프린터를 자동 제어하거나 중지하지 않습니다.</p>
      </section>
      <Link href="/dashboard" className="inline-flex rounded-control border border-primary bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">대시보드로 이동</Link>
    </article>
  );
}
