# 단계별 개발 기록

|단계|1. 완료한 작업|2. 생성·수정한 파일|3. 실행한 명령|4. 테스트 결과|5. 오류 및 수정|6. 다음 단계|
|---|---|---|---|---|---|---|
|1|허브와 갱신판 실물 대조, Python 3.12·React 환경 및 마스코트 구성|data/raw, data/prepare_official.py, backend/pyproject.toml, frontend/package.json, public SVG|공식 파일 다운로드, python data/prepare_official.py, uv sync, npm install|원본 대조 3,465값 일치, 1,155행 생성|uv 실행 파일 설치가 시스템 임시 경로에서 거부되어 작업 디렉터리 TEMP/TMP 사용|업로드·집계|
|2|UTF-8/CP949 검사, 영속화, 통계·품질·필터, 대시보드|services/data.py, tools/analytics.py, routers/api.py, pages/Data.tsx|uvicorn app.main:app, GET /api/health, POST /api/datasets/upload|공식 연도 합계와 당도 표본·출하량 검증|행 길이 불일치와 전부 결측인 지표를 별도로 처리|계획과 최적화|
|3|LangGraph 7노드, 도구 로그, 손익 계산, CBC 정수 배분|agents/workflow.py, agents/provider.py, tools/strategy.py|POST /api/agents/runs, GET /steps, pytest|작은 재고의 완전탐색과 3개 선호도 해 일치, 음수·불가능·0일 조건 검증|같은 날의 회차를 합치고 0kg 배치를 제거해 중복 출하비 방지|비교·보고|
|4|조건 입력·진행률·시나리오·민감도·보고서·감사 화면과 한글 PDF|pages/Strategy.tsx, services/export.py, fonts, CSS Modules|npm run build, 브라우저에서 실행·비교·PDF 내려받기|실제 다운로드, 7개 화면 이동, 390px 가로 넘침 없음|브라우저 자동 검사에서 실행 완료 전 탐색하는 경합을 바로잡고 완료된 실행 링크로 확인|회귀·패키징|
|5|pytest·Vitest·정적 검사, PostgreSQL 검증, Docker 구성, 문서·압축|tests/, *.test.tsx, backend/alembic, docker-compose.yml, docs/, README|pytest -q, npm test, ruff check, alembic upgrade head, docker compose config, docker compose up --build -d|pytest 20개, Vitest 4개 통과. React 빌드·PostgreSQL 마이그레이션 성공|Windows 샌드박스 임시 경로의 SQLite 문제는 작업 폴더 TEMP로 해결. Docker Engine 기동과 외부 LLM 실호출은 검증 대기|Docker Engine 및 제공자 키가 있는 환경에서 해당 두 경로 검증|
