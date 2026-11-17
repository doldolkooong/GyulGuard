# 실행 코드와 프롬프트

[그래프 실행](../backend/app/agents/workflow.py)은 7개 노드를 순서대로 연결한다. 데이터 상태를 읽어 분석 도구를 선택하고, [통계 도구](../backend/app/tools/analytics.py)와 [손익·배분·검산 도구](../backend/app/tools/strategy.py)를 호출한다. 실행 이력에는 입력 조건과 데이터 버전, 도구 소요 시간, 결과가 남는다.

### 모델과 실제 프롬프트

기본 실행값은 `LLM_PROVIDER=local`이다. 로컬 규칙 플래너가 실행 계획을 정하고 검증된 수치로 설명문을 만든다. `LLM_PROVIDER=openai`를 설정하면 [공급자 코드](../backend/app/agents/provider.py)가 `LLM_MODEL`에 지정한 모델(기본값 `gpt-4o-mini`)을 호출한다. 아래 중괄호는 코드가 런타임에 채우는 위치다.

| 호출 지점 | 실제 요청 문자열 | 출력 사용처 |
|---|---|---|
| plan_tools | `Select all applicable statistics from the following fixed tool identifiers. {허용 도구명을 쉼표와 공백으로 연결}` | choose_tools 호출의 인자를 Pydantic Plan으로 파싱한다. 선택한 도구 집합이 데이터에서 허용한 집합과 일치하는지 확인한다. |
| describe | `다음 검증된 출하 비교의 설명에서 먼저 다룰 항목을 선택하세요. 전략 선호도 {선호도} / {검증된 현금·비용·보관 문장}` | 구조화된 응답의 first를 현금·비용·보관 중 하나로 제한하고, 그 순서대로 Python에서 이미 계산한 문장을 배치한다. |

### 데이터에서 화면까지

1. [생산 자료 전처리](../data/prepare_official.py)와 [보조 자료 전처리](../data/prepare_optional.py)가 원본 CSV에서 분석 표를 생성한다. [수집 서비스](../backend/app/services/data.py)가 인코딩·열·결측·중복을 점검하고 DB에 보관한다.
2. [React API 클라이언트](../frontend/src/api/client.ts)가 농가 조건을 `POST /api/agents/runs`로 전송한다. [FastAPI 라우터](../backend/app/routers/api.py)는 실행 ID를 반환하고 백그라운드에서 그래프를 실행한다.
3. 웹은 `GET /api/agents/runs/{id}/steps`로 진행과 도구 로그를 읽는다. 완료 후 `GET /api/reports/{id}`와 `GET /api/reports/{id}/download?format=pdf`로 결과를 조회한다. CSV는 같은 경로에 `format=csv`를 준다.

의존성별 버전은 [라이브러리 목록](dependencies.md), 수식과 제약은 [최적화 설계](optimization_design.md)에 있다.
