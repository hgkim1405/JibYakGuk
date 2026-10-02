# Phase 2 TODO — e약은요 데이터 검증

목표는 추천 기능 구현이 아니라 **공식 데이터가 실제로 어떤 형태로 제공되는지 증거를 확보하는 것**입니다. 순서는 `공식 문서/승인 → 실제 요청 → raw 응답 → 분석 → coverage → 검증`입니다.

이 파일은 전체 Phase 2 미완료 항목의 기준 목록입니다. 날짜별로 실제 수행한 일과 근거는 [`daily/`](daily/README.md)에 `YYYY-MM-DD.md` 파일을 새로 만들어 기록합니다. 체크는 증거나 완료 결과가 있을 때만 표시하고, 지난 날짜 기록은 덮어쓰지 않습니다.

## 1. 공식 API 접근 조건 확인

- [ ] 현재 [e약은요 OpenAPI 안내](https://www.data.go.kr/data/15075057/openapi.do)에서 승인/활성화 상태 확인
- [ ] 사용 조건, quota, 호출 제한, 데이터 및 이미지 사용/저장 조건 확인
- [ ] 현재 operation endpoint와 HTTP method가 요청 지침의 대상 endpoint와 일치하는지 확인
- [ ] 실제 query parameter, 인증값의 parameter/header 위치, 응답 형식, pagination 조건 확인
- [ ] API key가 필요하면 집 PC의 로컬 secret store 또는 환경 변수로만 보관. 이 문서, `.env.example`, Git, 로그, manifest에 key/value를 넣지 않음

요청 지침에 적혀 있던 대상 endpoint는 다음과 같습니다. 최신 문서와 실제 승인 화면에서 다시 확인하기 전에는 확정된 계약으로 취급하지 않습니다.

```text
https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList
```

## 2. 첫 요청과 raw response 보존

- [ ] 확인한 조건으로 최소한의 실제 요청을 1회 수행
- [ ] method, endpoint, key를 제거한 parameter 이름/값, 요청 시각, HTTP status, content type을 manifest에 기록
- [ ] 원문 body는 해석·재포맷·정규화 없이 저장
- [ ] 원문/manifest를 `back/data/raw/` 아래에 분리 저장. API 약관상 저장이 가능한지 먼저 확인
- [ ] key가 URL query에 포함되는 경우 전체 URL을 그대로 로그/manifest로 남기지 않음
- [ ] 오류 응답도 성공 응답과 구분해 보존하고 status와 오류 내용을 분석

현재 [collector](../back/data-poc/collectors/easy_drug_client.py)는 parameter를 호출자가 전달하면 raw bytes를 돌려줄 뿐입니다. `serviceKey`, page 번호, row 수, `type` 등 parameter 이름이나 값의 기본값은 아직 코드에 넣지 않았습니다.

## 3. 실제 응답 구조 분석

- [ ] 문자 인코딩, content type, JSON/XML 여부, 응답 envelope 확인
- [ ] 실제 total count 필드와 pagination 동작을 확인하고 문서와 비교
- [ ] 실제 제품 identifier와 필드별 null/빈 문자열/누락 규칙 기록
- [ ] 효능, 용법, 주의사항, 상호작용, 부작용, 이미지, 업데이트 일자 필드가 실제 응답에 있는지 확인
- [ ] 문서에 있으나 응답에 없거나 이름이 다른 항목은 차이를 기록하고 추측으로 매핑하지 않음
- [ ] 원문 응답 예시에서 API key, 사용자 정보 등 민감값이 없는지 점검

필드 이름 및 identifier 매핑을 확정하기 전에 실제 response sample과 분석 메모를 남깁니다. 제품명 fuzzy matching으로 누락된 official identifier를 대신하지 않습니다.

## 4. 페이지 수집과 Coverage 리포트

실제 pagination 및 response schema를 확인한 다음에만 수집 반복 로직을 추가합니다. 수집 건수와 중복 제거 건수를 분리해 기록합니다.

필수 집계 항목:

- [ ] `totalCount`
- [ ] `downloadedRows`
- [ ] `uniqueItemSeq`
- [ ] `duplicates`
- [ ] `efcyCoverage`
- [ ] `useMethodCoverage`
- [ ] `warningCoverage`
- [ ] `interactionCoverage`
- [ ] `sideEffectCoverage`
- [ ] `imageCoverage`
- [ ] `updateDateRange`

이미지 관련 항목:

- [ ] `totalProducts`
- [ ] `itemImagePresent`
- [ ] `itemImageMissing`
- [ ] `validImageUrl`
- [ ] `brokenImageUrl`
- [ ] `pillIdentificationMatched`

측정 정의와 분모를 리포트에 같이 기록합니다. 실제 응답이나 이용 권한만으로 확인할 수 없는 metric은 추정값으로 채우지 말고 확인 불가 사유를 기록합니다. 이미지 URL 추가 확인 요청은 이용 조건과 호출 제한을 확인한 후 수행합니다.

## 5. 완료 조건 / 다음 단계

- [ ] 공식 API 문서/승인 상태와 실제 endpoint 조건 기록
- [ ] 비밀값이 제거된 request manifest와 허용된 raw response 확보
- [ ] 문서와 실제 response 차이를 포함한 analysis 작성
- [ ] coverage 리포트 생성 및 수집/중복/누락 수치 검증
- [ ] API 저장·재배포 조건과 Git에서 제외된 raw 데이터 공유 방법 결정

이 결과가 확보된 뒤에야 normalizer와 validator의 구체 schema를 정하고 다음 공식 데이터 source와 identifier JOIN 가능성을 조사합니다. 승인이 없거나 response에 필수 정보가 없으면 mock 데이터로 대체하지 말고 차단 조건과 재설계 선택지를 기록합니다.
