# 외부 소프트웨어 및 의존성 목록

Python 3.12와 Node.js 22 기반으로 실행한다. 아래 버전은 제출본 잠금 파일에서 추출했다. 직접 의존성과 전이 의존성을 함께 수록한다. [Python 잠금 파일](../backend/uv.lock) · [npm 잠금 파일](../frontend/package-lock.json)

## 분석·실행 환경

| 구성 | 역할 |
|---|---|
| FastAPI · SQLAlchemy · Alembic · psycopg | API, 저장, DB 스키마 관리 |
| pandas · NumPy · OR-Tools | 수치 집계, 정수 출하 배분 |
| LangGraph · langchain-openai · Pydantic | 그래프, 선택형 외부 모델 연결, 입출력 검증 |
| ReportLab | 한글 PDF 생성 |
| React · Vite · Recharts · Lucide · Vitest | 화면, 빌드, 차트, 아이콘, 테스트 |
| PostgreSQL 16 (Compose), SQLite (개발) | 관계형 DB |
| Docker Compose · Nginx · uv | 서비스 기동, 웹 배포, Python 패키지 설치 |
| Pretendard · 나눔고딕 | 웹·PDF 서체. [Pretendard 배포 조건](../frontend/public/Pretendard-LICENSE.txt) · [나눔고딕 배포 조건](../backend/fonts/OFL.txt) |

## Python 패키지

| 이름 | 버전 | 의존 관계 |
|---|---|---|
| absl-py | 2.5.1 | 전이 |
| alembic | 1.20.1 | 직접 |
| annotated-doc | 0.0.6 | 전이 |
| annotated-types | 0.8.0 | 전이 |
| anyio | 4.16.0 | 전이 |
| certifi | 2026.10.23 | 전이 |
| charset-normalizer | 3.5.2 | 전이 |
| click | 8.5.1 | 전이 |
| colorama | 0.4.6 | 전이 |
| distro | 1.9.0 | 전이 |
| fastapi | 0.163.1 | 직접 |
| greenlet | 3.5.6 | 전이 |
| h11 | 0.16.0 | 전이 |
| httpcore | 1.0.9 | 전이 |
| httpcore2 | 2.16.0 | 전이 |
| httpx | 0.28.1 | 직접 |
| httpx2 | 2.16.0 | 전이 |
| httpx2-jsfetch | 1.0 | 전이 |
| idna | 3.20 | 전이 |
| immutabledict | 4.3.1 | 전이 |
| iniconfig | 2.3.1 | 전이 |
| jiter | 0.19.0 | 전이 |
| jsonpatch | 1.47 | 전이 |
| jsonpointer | 3.12 | 전이 |
| langchain-core | 1.8.0 | 전이 |
| langchain-openai | 1.8.0 | 직접 |
| langchain-protocol | 0.0.21 | 전이 |
| langgraph | 1.2.22 | 직접 |
| langgraph-checkpoint | 4.3.2 | 전이 |
| langgraph-prebuilt | 1.1.2 | 전이 |
| langgraph-sdk | 0.4.14 | 전이 |
| langsmith | 0.14.17 | 전이 |
| mako | 1.4.3 | 전이 |
| markupsafe | 3.0.4 | 전이 |
| numpy | 2.5.4 | 직접 |
| openai | 3.51.0 | 전이 |
| opentelemetry-api | 1.45.2 | 전이 |
| orjson | 3.13.0 | 전이 |
| ormsgpack | 1.13.1 | 전이 |
| ortools | 9.15.6755 | 직접 |
| packaging | 26.3 | 전이 |
| pandas | 2.3.3 | 직접 |
| pillow | 13.0.0 | 전이 |
| pluggy | 1.7.0 | 전이 |
| protobuf | 6.33.6 | 전이 |
| psycopg | 3.3.9 | 직접 |
| psycopg-binary | 3.3.9 | 전이 |
| pydantic | 2.14.3 | 직접 |
| pydantic-core | 2.50.4 | 전이 |
| pygments | 2.21.0 | 전이 |
| pytest | 9.2.0 | 직접 |
| python-dateutil | 4.0.0 | 전이 |
| python-multipart | 0.0.33 | 직접 |
| pytz | 2026.6 | 전이 |
| pyyaml | 6.0.3 | 전이 |
| regex | 2026.11.9 | 전이 |
| reportlab | 4.5.1 | 직접 |
| requests | 2.34.2 | 전이 |
| requests-toolbelt | 1.0.0 | 전이 |
| ruff | 0.17.5 | 직접 |
| sniffio | 1.3.1 | 전이 |
| sqlalchemy | 2.0.57 | 직접 |
| starlette | 1.10.0 | 전이 |
| tenacity | 9.2.1 | 전이 |
| tiktoken | 0.14.0 | 전이 |
| truststore | 0.10.5 | 전이 |
| typing-extensions | 4.16.0 | 전이 |
| typing-inspection | 0.4.5 | 전이 |
| tzdata | 2026.6 | 전이 |
| urllib3 | 2.8.0 | 전이 |
| uuid-utils | 0.19.0 | 전이 |
| uvicorn | 0.54.0 | 직접 |
| websockets | 17.4 | 전이 |
| xxhash | 4.1.0 | 전이 |
| zstandard | 0.25.0 | 전이 |

## npm 패키지

선택 설치되는 운영체제별 패키지도 잠금 파일에 포함된다. 라이선스 표기는 잠금 파일의 선언값이다.

| 패키지 | 버전 | 의존 관계 | 라이선스 |
|---|---|---|---|
| @asamuzakjp/css-color | 3.2.0 | 전이 | MIT |
| lru-cache | 10.4.3 | 전이 | ISC |
| @babel/code-frame | 7.29.7 | 전이 | MIT |
| @babel/compat-data | 7.29.7 | 전이 | MIT |
| @babel/core | 7.29.13 | 전이 | MIT |
| @babel/generator | 7.29.14 | 전이 | MIT |
| @babel/helper-compilation-targets | 7.29.13 | 전이 | MIT |
| @babel/helper-globals | 7.29.7 | 전이 | MIT |
| @babel/helper-module-imports | 7.29.7 | 전이 | MIT |
| @babel/helper-module-transforms | 7.29.14 | 전이 | MIT |
| @babel/helper-plugin-utils | 7.29.7 | 전이 | MIT |
| @babel/helper-string-parser | 7.29.14 | 전이 | MIT |
| @babel/helper-validator-identifier | 7.29.7 | 전이 | MIT |
| @babel/helper-validator-option | 7.29.7 | 전이 | MIT |
| @babel/helpers | 7.29.14 | 전이 | MIT |
| @babel/parser | 7.29.14 | 전이 | MIT |
| @babel/plugin-transform-react-jsx-self | 7.29.7 | 전이 | MIT |
| @babel/plugin-transform-react-jsx-source | 7.29.7 | 전이 | MIT |
| @babel/runtime | 7.29.14 | 전이 | MIT |
| @babel/template | 7.29.7 | 전이 | MIT |
| @babel/traverse | 7.29.14 | 전이 | MIT |
| @babel/types | 7.29.14 | 전이 | MIT |
| @csstools/color-helpers | 5.1.0 | 전이 | MIT-0 |
| @csstools/css-calc | 2.1.4 | 전이 | MIT |
| @csstools/css-color-parser | 3.1.0 | 전이 | MIT |
| @csstools/css-parser-algorithms | 3.0.5 | 전이 | MIT |
| @csstools/css-tokenizer | 3.0.4 | 전이 | MIT |
| @esbuild/aix-ppc64 | 0.25.12 | 전이 | MIT |
| @esbuild/android-arm | 0.25.12 | 전이 | MIT |
| @esbuild/android-arm64 | 0.25.12 | 전이 | MIT |
| @esbuild/android-x64 | 0.25.12 | 전이 | MIT |
| @esbuild/darwin-arm64 | 0.25.12 | 전이 | MIT |
| @esbuild/darwin-x64 | 0.25.12 | 전이 | MIT |
| @esbuild/freebsd-arm64 | 0.25.12 | 전이 | MIT |
| @esbuild/freebsd-x64 | 0.25.12 | 전이 | MIT |
| @esbuild/linux-arm | 0.25.12 | 전이 | MIT |
| @esbuild/linux-arm64 | 0.25.12 | 전이 | MIT |
| @esbuild/linux-ia32 | 0.25.12 | 전이 | MIT |
| @esbuild/linux-loong64 | 0.25.12 | 전이 | MIT |
| @esbuild/linux-mips64el | 0.25.12 | 전이 | MIT |
| @esbuild/linux-ppc64 | 0.25.12 | 전이 | MIT |
| @esbuild/linux-riscv64 | 0.25.12 | 전이 | MIT |
| @esbuild/linux-s390x | 0.25.12 | 전이 | MIT |
| @esbuild/linux-x64 | 0.25.12 | 전이 | MIT |
| @esbuild/netbsd-arm64 | 0.25.12 | 전이 | MIT |
| @esbuild/netbsd-x64 | 0.25.12 | 전이 | MIT |
| @esbuild/openbsd-arm64 | 0.25.12 | 전이 | MIT |
| @esbuild/openbsd-x64 | 0.25.12 | 전이 | MIT |
| @esbuild/openharmony-arm64 | 0.25.12 | 전이 | MIT |
| @esbuild/sunos-x64 | 0.25.12 | 전이 | MIT |
| @esbuild/win32-arm64 | 0.25.12 | 전이 | MIT |
| @esbuild/win32-ia32 | 0.25.12 | 전이 | MIT |
| @esbuild/win32-x64 | 0.25.12 | 전이 | MIT |
| @jridgewell/gen-mapping | 0.3.13 | 전이 | MIT |
| @jridgewell/remapping | 2.3.5 | 전이 | MIT |
| @jridgewell/resolve-uri | 3.1.3 | 전이 | MIT |
| @jridgewell/sourcemap-codec | 1.6.0 | 전이 | MIT |
| @jridgewell/trace-mapping | 0.3.31 | 전이 | MIT |
| @remix-run/router | 1.23.4 | 전이 | MIT |
| @rolldown/pluginutils | 1.0.0-beta.27 | 전이 | MIT |
| @rollup/rollup-android-arm-eabi | 4.68.3 | 전이 | MIT |
| @rollup/rollup-android-arm64 | 4.68.3 | 전이 | MIT |
| @rollup/rollup-android-x64 | 4.68.3 | 전이 | MIT |
| @rollup/rollup-darwin-arm64 | 4.68.3 | 전이 | MIT |
| @rollup/rollup-darwin-x64 | 4.68.3 | 전이 | MIT |
| @rollup/rollup-freebsd-arm64 | 4.68.3 | 전이 | MIT |
| @rollup/rollup-freebsd-x64 | 4.68.3 | 전이 | MIT |
| @rollup/rollup-linux-arm-gnueabihf | 4.68.3 | 전이 | MIT |
| @rollup/rollup-linux-arm-musleabihf | 4.68.3 | 전이 | MIT |
| @rollup/rollup-linux-arm64-gnu | 4.68.3 | 전이 | MIT |
| @rollup/rollup-linux-arm64-musl | 4.68.3 | 전이 | MIT |
| @rollup/rollup-linux-loong64-gnu | 4.68.3 | 전이 | MIT |
| @rollup/rollup-linux-loong64-musl | 4.68.3 | 전이 | MIT |
| @rollup/rollup-linux-ppc64-gnu | 4.68.3 | 전이 | MIT |
| @rollup/rollup-linux-ppc64-musl | 4.68.3 | 전이 | MIT |
| @rollup/rollup-linux-riscv64-gnu | 4.68.3 | 전이 | MIT |
| @rollup/rollup-linux-riscv64-musl | 4.68.3 | 전이 | MIT |
| @rollup/rollup-linux-s390x-gnu | 4.68.3 | 전이 | MIT |
| @rollup/rollup-linux-x64-gnu | 4.68.3 | 전이 | MIT |
| @rollup/rollup-linux-x64-musl | 4.68.3 | 전이 | MIT |
| @rollup/rollup-openbsd-x64 | 4.68.3 | 전이 | MIT |
| @rollup/rollup-openharmony-arm64 | 4.68.3 | 전이 | MIT |
| @rollup/rollup-win32-arm64-msvc | 4.68.3 | 전이 | MIT |
| @rollup/rollup-win32-ia32-msvc | 4.68.3 | 전이 | MIT |
| @rollup/rollup-win32-x64-gnu | 4.68.3 | 전이 | MIT |
| @rollup/rollup-win32-x64-msvc | 4.68.3 | 전이 | MIT |
| @testing-library/dom | 10.4.2 | 전이 | MIT |
| @testing-library/react | 16.3.3 | 개발·테스트 | MIT |
| @types/aria-query | 5.0.4 | 전이 | MIT |
| @types/babel__core | 7.20.5 | 전이 | MIT |
| @types/babel__generator | 7.27.0 | 전이 | MIT |
| @types/babel__template | 7.4.4 | 전이 | MIT |
| @types/babel__traverse | 7.28.0 | 전이 | MIT |
| @types/chai | 5.2.3 | 전이 | MIT |
| @types/d3-array | 3.2.2 | 전이 | MIT |
| @types/d3-color | 3.1.3 | 전이 | MIT |
| @types/d3-ease | 3.0.2 | 전이 | MIT |
| @types/d3-interpolate | 3.0.4 | 전이 | MIT |
| @types/d3-path | 3.1.1 | 전이 | MIT |
| @types/d3-scale | 4.0.9 | 전이 | MIT |
| @types/d3-shape | 3.2.0 | 전이 | MIT |
| @types/d3-time | 3.0.4 | 전이 | MIT |
| @types/d3-timer | 3.0.2 | 전이 | MIT |
| @types/deep-eql | 4.0.2 | 전이 | MIT |
| @types/estree | 1.0.10 | 전이 | MIT |
| @types/prop-types | 15.7.15 | 전이 | MIT |
| @types/react | 18.3.31 | 개발·테스트 | MIT |
| @types/react-dom | 18.3.7 | 개발·테스트 | MIT |
| @vitejs/plugin-react | 4.7.0 | 개발·테스트 | MIT |
| @vitest/expect | 3.2.7 | 전이 | MIT |
| @vitest/mocker | 3.2.7 | 전이 | MIT |
| @vitest/pretty-format | 3.2.7 | 전이 | MIT |
| @vitest/runner | 3.2.7 | 전이 | MIT |
| @vitest/snapshot | 3.2.7 | 전이 | MIT |
| @vitest/spy | 3.2.7 | 전이 | MIT |
| @vitest/utils | 3.2.7 | 전이 | MIT |
| agent-base | 7.1.4 | 전이 | MIT |
| ansi-regex | 5.0.1 | 전이 | MIT |
| ansi-styles | 5.2.0 | 전이 | MIT |
| aria-query | 5.3.0 | 전이 | Apache-2.0 |
| assertion-error | 2.0.1 | 전이 | MIT |
| baseline-browser-mapping | 2.11.37 | 전이 | Apache-2.0 |
| browserslist | 4.29.5 | 전이 | MIT |
| cac | 6.7.14 | 전이 | MIT |
| caniuse-lite | 1.0.30001826 | 전이 | CC-BY-4.0 |
| chai | 5.3.3 | 전이 | MIT |
| check-error | 2.1.3 | 전이 | MIT |
| clsx | 2.1.1 | 전이 | MIT |
| convert-source-map | 2.0.0 | 전이 | MIT |
| cssstyle | 4.6.0 | 전이 | MIT |
| csstype | 3.2.3 | 전이 | MIT |
| d3-array | 3.2.5 | 전이 | ISC |
| d3-color | 3.1.1 | 전이 | ISC |
| d3-ease | 3.0.2 | 전이 | BSD-3-Clause |
| d3-format | 3.1.3 | 전이 | ISC |
| d3-interpolate | 3.0.2 | 전이 | ISC |
| d3-path | 3.1.1 | 전이 | ISC |
| d3-scale | 4.0.3 | 전이 | ISC |
| d3-shape | 3.2.1 | 전이 | ISC |
| d3-time | 3.1.1 | 전이 | ISC |
| d3-time-format | 4.1.1 | 전이 | ISC |
| d3-timer | 3.0.2 | 전이 | ISC |
| data-urls | 5.0.0 | 전이 | MIT |
| debug | 4.4.3 | 전이 | MIT |
| decimal.js | 10.6.0 | 전이 | MIT |
| decimal.js-light | 2.5.1 | 전이 | MIT |
| deep-eql | 5.0.2 | 전이 | MIT |
| dequal | 2.0.3 | 전이 | MIT |
| dom-accessibility-api | 0.5.16 | 전이 | MIT |
| dom-helpers | 5.2.1 | 전이 | MIT |
| electron-to-chromium | 1.5.486 | 전이 | ISC |
| entities | 6.0.1 | 전이 | BSD-2-Clause |
| es-module-lexer | 1.7.0 | 전이 | MIT |
| esbuild | 0.25.12 | 전이 | MIT |
| escalade | 3.2.0 | 전이 | MIT |
| estree-walker | 3.0.3 | 전이 | MIT |
| eventemitter3 | 4.0.7 | 전이 | MIT |
| expect-type | 1.4.0 | 전이 | Apache-2.0 |
| fast-equals | 5.4.5 | 전이 | MIT |
| fdir | 6.5.0 | 전이 | MIT |
| fsevents | 2.3.3 | 전이 | MIT |
| gensync | 1.0.0-beta.2 | 전이 | MIT |
| html-encoding-sniffer | 4.0.0 | 전이 | MIT |
| http-proxy-agent | 7.0.2 | 전이 | MIT |
| https-proxy-agent | 7.0.6 | 전이 | MIT |
| iconv-lite | 0.6.3 | 전이 | MIT |
| internmap | 2.0.3 | 전이 | ISC |
| is-potential-custom-element-name | 1.0.1 | 전이 | MIT |
| js-tokens | 4.0.0 | 전이 | MIT |
| jsdom | 26.1.0 | 개발·테스트 | MIT |
| jsesc | 3.1.0 | 전이 | MIT |
| json5 | 2.2.3 | 전이 | MIT |
| lodash | 4.18.1 | 전이 | MIT |
| loose-envify | 1.4.0 | 전이 | MIT |
| loupe | 3.2.1 | 전이 | MIT |
| lru-cache | 5.1.1 | 전이 | ISC |
| lucide-react | 0.468.0 | 직접 | ISC |
| lz-string | 1.5.0 | 전이 | MIT |
| magic-string | 0.30.21 | 전이 | MIT |
| ms | 2.1.3 | 전이 | MIT |
| nanoid | 3.3.20 | 전이 | MIT |
| node-releases | 2.0.64 | 전이 | MIT |
| nwsapi | 2.2.28 | 전이 | MIT |
| object-assign | 4.1.1 | 전이 | MIT |
| parse5 | 7.3.0 | 전이 | MIT |
| pathe | 2.0.3 | 전이 | MIT |
| pathval | 2.0.1 | 전이 | MIT |
| picocolors | 1.1.1 | 전이 | ISC |
| picomatch | 4.0.7 | 전이 | MIT |
| postcss | 8.5.33 | 전이 | MIT |
| pretty-format | 27.5.1 | 전이 | MIT |
| prop-types | 15.8.1 | 전이 | MIT |
| react-is | 16.13.1 | 전이 | MIT |
| punycode | 2.3.1 | 전이 | MIT |
| react | 18.3.1 | 직접 | MIT |
| react-dom | 18.3.1 | 직접 | MIT |
| react-is | 17.0.2 | 전이 | MIT |
| react-refresh | 0.17.0 | 전이 | MIT |
| react-router | 6.30.6 | 전이 | MIT |
| react-router-dom | 6.30.6 | 직접 | MIT |
| react-smooth | 4.0.4 | 전이 | MIT |
| react-transition-group | 4.4.5 | 전이 | BSD-3-Clause |
| recharts | 2.15.4 | 직접 | MIT |
| recharts-scale | 0.4.5 | 전이 | MIT |
| react-is | 18.3.1 | 전이 | MIT |
| rollup | 4.68.3 | 전이 | MIT |
| rrweb-cssom | 0.8.0 | 전이 | MIT |
| safer-buffer | 2.1.2 | 전이 | MIT |
| saxes | 6.0.0 | 전이 | ISC |
| scheduler | 0.23.2 | 전이 | MIT |
| semver | 6.3.2 | 전이 | ISC |
| siginfo | 2.0.0 | 전이 | ISC |
| source-map-js | 1.2.2 | 전이 | BSD-3-Clause |
| stackback | 0.0.2 | 전이 | MIT |
| std-env | 3.10.0 | 전이 | MIT |
| strip-literal | 3.1.0 | 전이 | MIT |
| js-tokens | 9.0.1 | 전이 | MIT |
| symbol-tree | 3.2.4 | 전이 | MIT |
| tiny-invariant | 1.3.3 | 전이 | MIT |
| tinybench | 2.9.0 | 전이 | MIT |
| tinyexec | 0.3.2 | 전이 | MIT |
| tinyglobby | 0.2.17 | 전이 | MIT |
| tinypool | 1.1.1 | 전이 | MIT |
| tinyrainbow | 2.0.0 | 전이 | MIT |
| tinyspy | 4.0.6 | 전이 | MIT |
| tldts | 6.1.86 | 전이 | MIT |
| tldts-core | 6.1.86 | 전이 | MIT |
| tough-cookie | 5.1.2 | 전이 | BSD-3-Clause |
| tr46 | 5.1.1 | 전이 | MIT |
| typescript | 5.9.3 | 개발·테스트 | Apache-2.0 |
| update-browserslist-db | 1.3.4 | 전이 | MIT |
| victory-vendor | 36.9.2 | 전이 | MIT AND ISC |
| vite | 6.4.6 | 개발·테스트 | MIT |
| vite-node | 3.2.4 | 전이 | MIT |
| vitest | 3.2.7 | 개발·테스트 | MIT |
| w3c-xmlserializer | 5.0.0 | 전이 | MIT |
| webidl-conversions | 7.0.0 | 전이 | BSD-2-Clause |
| whatwg-encoding | 3.1.1 | 전이 | MIT |
| whatwg-mimetype | 4.0.0 | 전이 | MIT |
| whatwg-url | 14.2.0 | 전이 | MIT |
| why-is-node-running | 2.3.0 | 전이 | MIT |
| ws | 8.23.0 | 전이 | MIT |
| xml-name-validator | 5.0.0 | 전이 | Apache-2.0 |
| xmlchars | 2.2.0 | 전이 | MIT |
| yallist | 3.1.1 | 전이 | ISC |
