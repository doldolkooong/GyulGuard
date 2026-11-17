# 추가 업로드용 공식 CSV

두 파일은 서로 다른 조사 단위의 관측 자료다. 데이터 탐색기에서 각각 업로드하여 선택한다. 같은 연도의 생산 자료에 행 단위로 결합하면 생산량이나 당도를 중복 집계할 수 있다.

| 업로드 파일 | 기관·기간 | 필드와 해석 |
|---|---|---|
| `quality.csv` | 제주국제자유도시개발센터, 2020년 11월 1주~12월 1주 | `site_id` 측정지점 관리번호, `city` 행정시, `region` 하위 지역, `year` 연도, `week` 원본 측정 주차, `brix` 당도(°Bx) |
| `shipment.csv` | 제주농산물수급관리센터·제주데이터허브, 2022-11-25~26 | `date` 출하일, `year` 연도, `variety` 재배유형, `port` 신고소, `shipment_t` 해당 신고소 출하량(톤) |

**당도 조사.** CP949 원본은 44행 × 14열이다. 44개 관리번호가 18개 하위 지역에 걸쳐 있다. 주차별 당도 열의 220개 셀 중 43개가 비어 있어 관측된 177개 값만 사용했다. 범위는 9.62~13.86°Bx다. 정규화 후 관리번호와 주차의 중복은 0개다. 지역·주차별 표본 수가 다르므로 전체 평균을 제주 감귤 모집단 평균으로 해석하기 어렵다. 데이터에 등급이 없다. [공공데이터포털](https://www.data.go.kr/data/15077686/fileData.do) · [원본 파일](https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId=FILE_000000002371327&fileDetailSn=1&insertDataPrcus=N)

**출하 조사.** 허브가 배포한 실제 데이터 미리보기 CSV는 CP949, 20행 × 5열이다. 결측 셀·완전 중복 행은 없다. 이틀 모두 제공되는 노지온주 × 제주공항·제주항만 추려 4행을 사용했다. 11월 25일의 합계 927.35톤, 26일의 합계 752.62톤은 해당 두 신고소의 노지온주 실적이다. 장기 추세와 제주 전체 출하량을 산출하기에는 관측 범위가 좁다. [제주데이터허브](https://www.jejudatahub.net/data/view/data/855) · [원본 미리보기](https://www.jejudatahub.net/api/file?id=5278&fileId=2111)

원본은 `data/raw/jdc-brix-2020.csv`와 `data/raw/jejudatahub-855-preview.csv`에 보존했다. 프로젝트 루트에서 `python data/prepare_optional.py`를 실행해 두 UTF-8 CSV를 재생성할 수 있다.
