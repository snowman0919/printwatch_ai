export default function PrivacyPage() {
  return (
    <article className="space-y-8 text-sm leading-7">
      <div><p className="font-mono text-xs tracking-[0.14em] text-primary">EFFECTIVE 2026-08-28</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">개인정보처리방침</h1></div>
      <section><h2 className="text-lg font-semibold">처리하는 정보와 목적</h2><p className="mt-2 text-muted">접근 통제와 사용자 표시를 위해 Clerk와 Google OAuth가 제공하는 이름, 학교 이메일 주소와 로그인 식별자를 처리합니다. 출력 감시를 위해 프린터 텔레메트리, 카메라 JPEG, AI 분석 결과와 보안·오류 로그를 처리합니다.</p></section>
      <section><h2 className="text-lg font-semibold">보관</h2><p className="mt-2 text-muted">1 FPS 준실시간 이미지는 프린터별 최신 파일 하나로 덮어씁니다. 분석용 스냅샷은 프린터별 최근 480장을 보관하며 기본 15초 간격에서는 약 2시간 분량입니다. 계정·분석 메타데이터와 운영 로그는 서비스 운영과 보안 확인에 필요한 기간 동안 보관한 뒤 삭제합니다.</p></section>
      <section><h2 className="text-lg font-semibold">외부 처리자와 전송</h2><p className="mt-2 text-muted">Google은 OAuth 신원 확인을, Clerk는 인증 세션을 처리합니다. Cloudflare Tunnel은 암호화된 웹 트래픽 전달에 사용됩니다. 카메라 이미지는 서비스 서버가 지정된 Qwythos/Ollama 분석 엔드포인트로 전송하며 광고 판매나 맞춤 광고에 사용하지 않습니다.</p></section>
      <section><h2 className="text-lg font-semibold">이용자 권리와 문의</h2><p className="mt-2 text-muted">자신의 계정 정보 열람·정정·삭제 또는 이용 중지를 원하면 초대 메일을 보낸 서비스 관리자에게 요청할 수 있습니다. 카메라는 프린터만 촬영하도록 설치해야 하며 사람을 상시 촬영하는 용도로 사용하지 않습니다.</p></section>
    </article>
  );
}
