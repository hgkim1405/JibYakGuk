# Phase 2 TODO — e약은요 데이터 검증

목표는 추천 기능 구현이 아니라 **공식 데이터가 실제로 어떤 형태로 제공되는지 증거를 확보하는 것**입니다. 순서는 `공식 문서/승인 → 실제 요청 → raw 응답 → 분석 → coverage → 검증`입니다.

체크는 실제 근거가 있는 항목만 표시합니다. 작업일별 이력은 [`daily/`](daily/README.md)에 새 파일로 남기며 이전 날짜의 기록은 덮어쓰지 않습니다. 전체 계획은 [`ROADMAP.md`](ROADMAP.md)를 기준으로 관리합니다.

## 현재 상태 — 2026-10-06

e약은요 API 실제 호출, 4,757행 전체 raw 수집, 응답 검증, 정규화, coverage는 완료했습니다. 이미지 접근성 표본은 DNS 오류라 URL별 HTTP 접근성을 측정하지 못했습니다. Phase 3에서 product permit source와 exact join 후 `bizrno === BIZRNO`가 4,757/4,757행 일치했지만 e약은요의 공식 field 정의/사용범위는 확인되지 않았습니다. 낱알식별 JOIN은 실제 source로 확인했습니다. 기존 raw snapshot은 Git으로 버전관리해 다른 PC에서 재수집 없이 쓸 수 있도록 절차를 변경했습니다. 중복 행의 source 의도도 미확인으로 남아 있습니다.

핵심 근거:

- 응답 분석: [`../back/data-poc/sources/easy-drug/OBSERVATIONS-2026-10-06.md`](../back/data-poc/sources/easy-drug/OBSERVATIONS-2026-10-06.md)
- raw snapshot (Git 버전관리): `back/data/raw/easy-drug/snapshot-2026-10-06T05-52-37.917Z/`
- coverage JSON (Git 제외): `back/data/reports/easy-drug/snapshot-2026-10-06T05-52-37.917Z-analysis.json`
- normalized JSON (Git 제외): `back/data/normalized/easy-drug/snapshot-2026-10-06T05-52-37.917Z.json`

## 1. 공식 API 접근 조건 확인

- [x] 사용자가 제공한 2026-10-06 API 통합 명세에서 endpoint, 개발 quota(10,000/day), API 형식 및 사용허락 범위를 확인. 성공 응답 51회(전체수집 48회 + 탐색 3회); 별도로 HTTP 응답이 없는 연결 시도 1회는 quota 집계 여부 미확인
- [x] 2026-10-06 공공데이터포털 상세 페이지 재확인: 무료, 이용허락범위 제한 없음, 개발계정 10,000회/일. 포털 정책은 제3자 권리가 포함된 저작물에 별도 이용허락이 필요하다고 안내
- [x] 이미지 권리 확인 범위 명시: e약은요 공개 API 페이지에는 연결 이미지 파일에 대한 별도 재사용 허락이 없고, 포털 정책은 제3자 권리 저작물에 권리자 이용허락을 요구함. 이미지 권리자의 허락 자체는 확인되지 않아 저장·재배포 권한은 미완료
- [x] `GET https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList`를 실제 요청해 HTTP 200 / `resultCode=00` 확인
- [x] 인증 파라미터는 현재 명세대로 `ServiceKey`; `pageNo`, `numOfRows`, `type=json` 및 100행 page size/pagination을 실제 응답으로 확인
- [x] 사용자가 제공한 key는 실행 프로세스 환경변수로만 전달. 코드, 문서, raw, metadata, 콘솔 및 Git에 저장하지 않음
- [x] 전체 raw의 비어 있지 않은 `itemImage` URL 2,767개는 모두 `nedrug.mfds.go.kr` host
- [x] 접근성 표본 요청 20건 시도: GET + `Range: bytes=0-0`, redirect 미추적, 응답 body 취소. 20건 모두 로컬 DNS `ENOTFOUND`; 이 결과는 원격 URL이 깨졌다는 뜻이 아니며 전체 접근성은 미측정
- [x] 재현 가능한 표본 실행기 [`image-url-audit.ts`](../back/data-poc/sources/easy-drug/image-url-audit.ts) 추가. 같은 20개 URL 재호출도 20/20 DNS `ENOTFOUND`; HTTP status가 없으므로 URL별 접근성·broken 판정에는 사용하지 않음
- [ ] 집 PC 또는 DNS가 되는 환경에서 이미지 접근성 표본을 다시 확인하고, 이미지 파일 저장/재배포 전에 권리 범위를 확인
- [x] 데이터 이관 방침 변경: 현재 raw snapshots를 Git으로 버전관리해 다른 PC에서 재수집 없이 같은 입력으로 계속 작업; normalized/report는 snapshot에서 로컬 재생성, key는 로컬에만 보관

요청 endpoint:

```text
https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList
```

인증키가 URL query에 포함되므로 request URL 전체를 출력하지 않습니다. `back/node/.env.example`에는 빈 변수명과 형식만 두고 실제 key는 각 머신의 로컬 `.env` 또는 실행 환경에서 설정합니다.

## 2. 첫 요청과 raw response 보존

- [x] 작은 실제 요청 1회: page 1, 10행; 뒤이어 page 2, 10행 및 page 1, 100행으로 pagination/page size 확인
- [x] `GET`, endpoint, `ServiceKey` parameter 이름, page range/size, timestamp, HTTP status, result code를 key 없이 snapshot manifest/metadata에 저장
- [x] 48개 페이지 raw body를 해석·재포맷하지 않고 snapshot directory에 저장
- [x] raw body와 metadata를 `back/data/raw/easy-drug/` 아래 보존; 원문 API snapshots는 Git으로 버전관리
- [x] 모든 응답의 raw 저장 전 API key 원문/URL-encoded 값을 검사하고, 응답에 포함된 경우 저장 중단
- [ ] 실제 API error response는 아직 받지 못함: 2026-10-06 fake-key probe는 `apis.data.go.kr` 로컬 DNS `ENOTFOUND`에서 끝남. 별도의 가짜 response harness에서 collector가 HTTP 200 / `resultCode=30` API-error body를 raw로 저장하고 저장 metadata에 credential marker를 넣지 않는 일반 경로는 확인했지만, 이는 원격 API 오류 응답 검증이 아님. DNS가 되는 환경에서 안전한 오류 probe 또는 실제 오류 응답을 확보해야 함

실행 코드는 [`easy-drug.client.ts`](../back/data-poc/sources/easy-drug/easy-drug.client.ts), [`easy-drug.collector.ts`](../back/data-poc/sources/easy-drug/easy-drug.collector.ts)입니다. 첫 페이지는 10행, 전체 수집은 실제 허용을 확인한 100행 요청을 기본으로 사용합니다.

## 3. 실제 응답 구조 분석

- [x] HTTP status/content type, JSON envelope `{ header, body }`, `header.resultCode/resultMsg` 확인
- [x] `body.pageNo`, `numOfRows`, `totalCount`, `items[]`와 48페이지 pagination 확인
- [x] 전체 응답 `totalCount=4,757`, 다운로드 4,757행, 누락 페이지 0 확인
- [x] 필드 이름·타입·null/빈 문자열/누락 수를 4,757행 기준으로 분석
- [x] `itemSeq`는 4,757행 모두 non-empty string; 4,740 unique, 14개 중복 group, 중복 초과 행 17건
- [x] 중복 group 14개에서 변동한 필드는 모두 `itemImage`뿐임을 확인: 10개 group은 2행/서로 다른 2 URL, 3개는 3행/서로 다른 3 URL, 1개는 2행(빈 값+URL). 다중 이미지가 source의 의도인지는 미확인
- [x] 공식 API 상세 페이지의 response element 표에도 `bizrno`가 없음을 대조. 실제 응답의 전 행에서 보였으나 공식 의미는 미확인이라 normalized 결과에서는 제외
- [x] raw 응답은 보고서에 복사하지 않았고, collector가 key echo를 검사

실제 item field는 `entpName`, `itemName`, `itemSeq`, `efcyQesitm`, `useMethodQesitm`, `atpnWarnQesitm`, `atpnQesitm`, `intrcQesitm`, `seQesitm`, `depositMethodQesitm`, `openDe`, `updateDe`, `itemImage`, `bizrno`였습니다. 4,757행 모두에서 14개 항목이 존재했습니다. `itemImage`는 null 1,989건, 빈 문자열 1건, 비어 있지 않은 URL 2,767건이었습니다.

## 4. 페이지 수집과 Coverage 리포트

분모는 중복을 제거하기 전 전체 API response 행 4,757입니다.

- [x] `totalCount`: 4,757
- [x] `downloadedRows`: 4,757
- [x] `uniqueItemSeq`: 4,740
- [x] `duplicates`: 17개 중복 초과 행 (14개 `itemSeq` group)
- [x] `efcyCoverage`: 4,747 / 4,757 (99.8%)
- [x] `useMethodCoverage`: 4,754 / 4,757 (99.9%)
- [x] `warningCoverage`: 1,153 / 4,757 (24.2%)
- [x] `interactionCoverage`: 3,302 / 4,757 (69.4%)
- [x] `sideEffectCoverage`: 4,523 / 4,757 (95.1%)
- [x] `imageCoverage`: 2,767 / 4,757 (58.2%)
- [x] `updateDateRange`: 2021-01-29 – 2026-10-02
- [x] `totalProducts`: 4,757 API rows; duplicate row 17건은 이 분모에 포함
- [x] `itemImagePresent` / `itemImageMissing`: 2,767 / 1,990
- [x] `validImageUrl`: 2,767개가 syntactic HTTP(S) URL 검사 통과; URL 문법 기준만 확인
- [x] `brokenImageUrl` 표본 방법: 모집단은 현재 snapshot의 non-empty distinct URL 2,767개. lexical sort 후 균등 간격으로 20개를 골라 재현 가능한 spot check를 하고, 표본 수치만으로 전체 URL 상태를 추정하지 않음. 기존 ad hoc 20건은 선정 규칙이 기록되지 않아 새 표본 결과와 섞지 않음
- [ ] 현재 snapshot의 재현 표본 HTTP 상태/content type을 DNS가 가능한 환경에서 확인. 404/410만 `broken`으로 세고 401/403, 최대 4회 같은-host redirect, 다른 host redirect, 5xx, DNS/timeout은 별도 상태로 보고하며 broken으로 합치지 않음
- [ ] `pillIdentificationMatched`: Phase 3 낱알식별 source/JOIN 단계에서 측정

## 5. 완료 조건 / 다음 단계

- [x] 제공된 API 명세와 실제 성공 응답으로 endpoint/요청 조건 기록
- [x] key를 제거한 page metadata 및 로컬 raw snapshot 확보
- [x] 실제 응답 차이를 포함한 [analysis 기록](../back/data-poc/sources/easy-drug/OBSERVATIONS-2026-10-06.md)과 기계 리포트 생성
- [x] pagination/행 수/중복/field coverage 검증 및 실제 응답 기반 type, validator, normalizer 구현
- [x] PC 간 작업 절차 결정: 코드·문서·기존 raw snapshots를 Git으로 가져와 같은 원문으로 재개; key는 새 API 요청이 필요한 시점에만 각 PC 로컬 환경에서 사용
- [ ] DNS가 허용된 환경에서 이미지 접근성 재측정
- [ ] 중복 행이 `itemImage`만 다른 구조임을 보고했으며, provider가 의도한 관계인지는 별도 설명/원천 문서 필요
- [ ] 미문서화 `bizrno`의 공식 의미와 사용범위를 제공기관 문서/API 담당자 근거로 확인. 현재 product-permit의 `BIZRNO`와 4,757/4,757 exact itemSeq-joined rows에서 값이 같다는 교차 source 증거는 있으나 정의/사용 허가를 대체하지 않으므로 normalized 구조에서는 계속 제외

현재 남은 외부 확인은 `nedrug.mfds.go.kr` 접근성/이미지 권리, `bizrno` 정의와 사용범위, 중복 행의 공식 설명입니다. 이미지 표본 실행기 report는 Git 제외 `back/data/reports/easy-drug/image-url-sample-2026-10-06-network-retry.json`에 있습니다. 기존 raw snapshot은 Git에서 받아 재수집 없이 사용하고, normalized/report는 로컬 생성합니다. 새 시점 변화 측정에 필요할 때만 공식 API에서 새 snapshot을 수집합니다. 낱알식별 JOIN과 `pillIdentificationMatched`는 Phase 3 exact-identifier report에서 측정했습니다. 제품명 fuzzy matching으로 JOIN 성공률을 부풀리지 않으며, 이 데이터만으로 Firestore schema·추천·safety 규칙을 확정하지 않습니다.

## 외부 근거 (2026-10-06 확인)

- [식품의약품안전처 e약은요 API 상세](https://www.data.go.kr/data/15075057/openapi.do): 무료, 개발계정 10,000회/일, 이용허락범위 제한 없음. response element에 `itemImage`는 있고 `bizrno`는 없음.
- [공공데이터포털 이용정책](https://www.data.go.kr/ugs/selectPortalPolicyView.do): 제3자 권리가 포함된 데이터는 권리자의 정당한 이용허락이 필요하다고 명시.
