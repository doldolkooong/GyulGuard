# Agent 실행

|LangGraph 노드|도구 및 산출물|
|---|---|
|실행 계획|데이터셋의 열·지표에 따라 가능한 분석 도구를 정한다. openai 모드는 choose_tools를 실제 tool calling으로 호출하고 Pydantic Plan과 허용 목록으로 응답을 검증한다.|
|데이터 점검|inspect_dataset으로 원본 인코딩, 결측, 중복, 기간, 사용 가능 지표 조회.|
|현황 분석|summarize_citrus_data와 선택된 analyze_production_by_region, analyze_shipment_trends, analyze_quality_metrics 수행.|
|시나리오 생성|build_shipment_scenarios로 후보 일정을 만들고 simulate_revenue_scenarios로 매출·출하비·보관비를 계산.|
|물량 최적화|optimize_shipment_plan이 OR-Tools CBC 정수해를 계산. 불가능 상태를 별도로 보존.|
|조건 검증|verify_scenario_results의 검산 후 compare_scenarios가 조건 충족 일정의 점수로 우선안과 서로 다른 배분의 대안을 선택.|
|보고서 생성|generate_strategy_report가 출처, 가정, 통계, 후보, 한계를 묶는다. 검증된 값으로 추천 이유를 작성해 저장한다.|

기본 local 모드는 외부 호출 없이 재현된다. openai 모드는 설명의 첫 주제도 Pydantic 구조화 출력으로 선택한다. 숫자는 Python이 기입한다. 공급자가 응답하지 않거나 허용되지 않은 도구를 선택하면 실패가 기록된다. 워크플로에는 순환 경로가 없고 최대 재귀 한도는 12다.

도구 호출의 공통 래퍼는 execution_id, tool_name, parameters, success, elapsed_ms, dataset_version, result, error를 저장한다. 입력 데이터셋과 conditions를 이용해 재실행할 수 있다. 영속 보고서와 다운로드는 동일한 실행 ID를 사용한다.
