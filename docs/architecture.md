# 서비스 구조

브라우저의 React Router가 7개 화면을 제공한다. useData 훅은 선택한 자료와 필터가 바뀌면 API를 다시 읽고 이전 요청의 늦은 응답을 무시한다. 개발에서는 Vite, 배포에서는 Nginx가 같은 Origin에서 API 요청을 전달한다.

FastAPI 라우터는 Pydantic으로 입력과 주요 응답을 검증한다. repositories는 엔티티 조회와 404 처리를, services는 CSV 검사·정규화·파일 출력을, tools는 집계와 손익 계산을 담당한다. 업로드는 파일명을 저장 경로로 사용하지 않고 SQLAlchemy 바인딩으로 원본 바이트와 레코드를 보관한다.

|테이블|내용|
|---|---|
|datasets / dataset_columns / citrus_records|출처·버전·원본·품질, 열 정보, 원본 순서의 측정 레코드|
|analysis_runs / analysis_run_steps|입력, 처리 상태, 단계별 시간|
|agent_executions / tool_logs|플래너 모드·도구 계획, 실행 식별자·인수·출력·오류 유형|
|scenario_results / optimization_results|후보 배분과 손익, CBC 상태와 최적 배분|
|reports|실행 ID별 결과·소스·제약과 설명 스냅샷|

실행 제출은 202와 식별자를 반환한다. 단일 서버 프로세스의 백그라운드 작업은 별도 DB 세션에서 그래프를 실행한다. 단계와 로그를 각각 커밋해 진행 중 조회할 수 있다. 실패하면 DB 트랜잭션을 롤백하고 실행 상태에 오류 유형을 남긴다. 서버 재시작 시 중단된 작업은 실패로 표시한다. 운영용 다중 워커와 자동 재시도 큐는 구현 범위 밖이다.

CORS는 지정 Origin에 제한한다. CSV 본문과 자유 입력은 모델 프롬프트에 전달하지 않는다. 모델은 허용된 도구 이름과 검증된 설명 순서만 선택할 수 있다. 감사 로그는 도구 파라미터와 수치 결과를 저장하며 API 키나 공급자 오류 본문을 저장하지 않는다.
