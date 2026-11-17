# 귤지킴이 · GyulGuard

심사자는 [필수 제출 항목별 안내](제출안내.md)에서 실행 코드·프롬프트, 매뉴얼, 데이터 이용조건, 결과 설명자료를 확인할 수 있다. [오류 해결과 제약사항](docs/troubleshooting.md)

제주 감귤 농가를 위한 출하 의사결정 AI Agent. 농가가 가진 물량과 당장 필요한 현금, 예상 단가, 비용을 입력하면 즉시 출하·분할 출하·보관·최적화 일정을 같은 조건으로 비교한다. 감귤은 출하를 미루면 단가와 비용이 함께 달라진다. 이 서비스는 그 선택을 kg과 원 단위로 설명한다.

## 빠른 시작

Docker Engine과 Compose v2가 실행되는 환경에서 프로젝트 루트에서 실행한다.

```sh
docker compose up --build -d
docker compose ps
```

브라우저에서 http://localhost:8080 을 연다. PostgreSQL 준비 → Alembic 마이그레이션 → 공식 자료 등록 → API 기동 → 웹 기동 순이다. 종료는 `docker compose down`. 농가 입력과 실행 이력은 pgdata 볼륨에 저장된다.

**Windows 로컬 시연**에는 uv, Node.js 22, npm이 필요하다. PowerShell에서 `./scripts/start-local.ps1`을 실행한 뒤 http://127.0.0.1:8130 을 연다. 이 경로는 빌드한 React 앱과 API를 한 프로세스에서 제공하며 SQLite를 사용한다. 첫 설치에는 인터넷이 필요하다.

## 개발 실행

```sh
cd backend
uv sync --frozen --python 3.12
uv run python -m uvicorn app.main:app --reload --port 8000
```

별도 터미널에서 다음을 실행한다.

```sh
cd frontend
npm ci
npm run dev
```

Vite는 /api 요청을 포트 8000에 전달한다. 개발 UI는 http://localhost:5173 이며 API 명세는 http://localhost:8000/docs 에 있다. 외부 PostgreSQL을 이용할 때는 백엔드 환경변수 DATABASE_URL을 설정하고 `uv run python -m alembic upgrade head`를 먼저 실행한다.

## 환경변수

|이름|기본 동작|
|---|---|
|DATABASE_URL|개발 SQLite. Compose는 PostgreSQL 연결 문자열을 주입한다.|
|POSTGRES_PASSWORD|Compose 로컬 DB 비밀번호. 변경 시 URL에 사용할 수 있는 문자로 지정한다.|
|LLM_PROVIDER|local은 키 없이 재현 가능한 규칙 플래너, openai는 실제 모델 도구 호출과 구조화된 설명 선택을 사용한다.|
|LLM_MODEL / OPENAI_API_KEY|모델 이름과 서버 전용 키. Compose는 루트 .env에서 읽으며 로컬 실행은 셸 환경변수를 사용한다.|
|DATA_DIR / CORS_ORIGINS|원본·가공 자료 경로 및 쉼표로 구분한 허용 Origin 목록.|
|API_TARGET|Vite 개발 서버가 연결할 백엔드 주소.|

`.env.example`을 복사해 필요한 값만 채운다. 키와 .env는 제출 압축에 포함하지 않는다.

## 주요 화면

|화면|할 수 있는 일|
|---|---|
|대시보드|최근 수록 연도 생산량, 지역 상위 5곳, 연도별 추이, 최근 분석 조회|
|데이터 탐색기|공식 자료 선택, CSV 업로드, 자료형·결측·중복·미리보기 확인|
|감귤 현황 분석|연도·지역·재배유형 필터, 생산량·실제 출하량·당도·등급별 비교|
|Agent 실행 센터|출하 조건과 전략 입력, 실행 단계·소요시간·도구 호출 확인|
|시나리오 비교|우선 검토안·대안, 비용과 순현금, 일차별 kg, 제약 위반 확인|
|보고서 센터|저장된 분석 선택, PDF와 CSV 다운로드|
|시스템 로그|실행 파라미터, 데이터 버전, 플래너 구성, 단계·도구 결과와 실패 조회|

## 구조와 기술

```text
backend/   FastAPI, SQLAlchemy 2, Alembic, Pydantic 2, pandas, NumPy, OR-Tools, LangGraph, ReportLab
frontend/  React, TypeScript, Vite, React Router, Recharts, Lucide, CSS Modules
data/      원본 CSV, 재현 스크립트, 정규화 자료, QA 결과
docs/      요구사항, 구조, 데이터 사전, 모델 수식, 실행·테스트 기록
scripts/   로컬 시연 실행
```

플래너 → 데이터 검사 → 통계 도구 선택·집계 → 비교 일정 생성 → 정수 최적화 → 수치·제약 검증 → 보고서 저장. 데이터 버전은 업로드한 바이트의 SHA-256이다. 분석 수치와 그래프는 Python 도구 결과에서 만들어진다.

## 데이터와 해석

- 기본 생산 자료는 2012~2022년 서귀포시 15개 읍면동의 7개 재배유형이다. 허브 파일의 수치 2,832개를 사용하고 제공기관 갱신판으로 빈 값과 2022년을 보완했다. [제주데이터허브](https://www.jejudatahub.net/data/view/data/1313) · [서귀포시 갱신판](https://www.data.go.kr/data/15048184/fileData.do)
- 실제 출하량 보조 자료는 제주항·제주공항 노지온주의 이틀치 관측이다. 당도 보조 자료는 44개 지점에서 측정한 177개 값이다. 각 자료는 독립적으로 선택한다. [출하 자료](https://www.jejudatahub.net/data/view/data/855) · [당도 자료](https://www.data.go.kr/data/15077686/fileData.do)
- 예상 순수입은 가정된 판매액에서 출하비와 보관비를 차감한 값이다. 생산비와 농가별 감모는 포함하지 않는다. 생산 통계는 지역·계절 맥락을 제공하며 현재 가격이나 미래 단가를 정하지 않는다. 장기 출하 실측, 저장 중 감모율과 등급별 실수취가 확보는 후속 과제다.
- 단일 농가·심사용 로컬 시연을 기준으로 했다. 다중 사용자 운영에는 인증, 농가별 데이터 격리, 영속 실행 큐가 필요하다.

## 테스트와 재현

```sh
cd backend
uv run python -m pytest -q
uv run ruff check app tests alembic
cd ../frontend
npm ci
npm test
npm run build
```

루트에서 `python data/prepare_official.py`와 `python data/prepare_optional.py`를 실행하면 정규화 자료를 재생성한다. 상세 검증 내역은 [테스트 결과](docs/test_results.md), 사용법은 [사용 설명서](docs/user_manual.md)에 있다.
