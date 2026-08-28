export default function TermsPage() {
  return (
    <article className="space-y-8 text-sm leading-7">
      <div><p className="font-mono text-xs tracking-[0.14em] text-primary">EFFECTIVE 2026-08-28</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">이용약관</h1></div>
      <section><h2 className="text-lg font-semibold">이용 범위</h2><p className="mt-2 text-muted">PrintWatch AI는 관리자가 초대한 @dimigo.hs.kr 계정에 제공되는 학교 내부 프린터 감시 도구입니다. 계정이나 장치 토큰을 공유하거나 승인되지 않은 장비·영상에 연결해서는 안 됩니다.</p></section>
      <section><h2 className="text-lg font-semibold">판정과 안전</h2><p className="mt-2 text-muted">AI의 완료·실패·스파게티 판정은 보조 정보이며 정확성이나 연속 가용성을 보장하지 않습니다. 사용자는 현장을 포함한 적절한 방법으로 상태를 확인해야 하며, 이 서비스를 화재·기계 안전을 위한 유일한 감시 수단으로 사용해서는 안 됩니다.</p></section>
      <section><h2 className="text-lg font-semibold">서비스 동작</h2><p className="mt-2 text-muted">서비스는 프린터에 상태 조회 명령만 보내고 전원, 히터, 모터 또는 출력 중지 명령을 전송하지 않습니다. 유지보수, 네트워크 또는 외부 인증 제공자의 장애로 서비스가 일시 중단될 수 있습니다.</p></section>
      <section><h2 className="text-lg font-semibold">변경과 문의</h2><p className="mt-2 text-muted">중요한 정책 변경은 서비스 화면 또는 초대에 사용된 연락 경로로 알립니다. 이용 중지나 정책 관련 요청은 초대 메일을 보낸 서비스 관리자에게 문의할 수 있습니다.</p></section>
    </article>
  );
}
