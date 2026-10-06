# e약은요 API 관찰 결과 — 2026-10-06

## 요청과 원문 보존

- Endpoint: `https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList`
- Method / 인증 파라미터 이름: `GET` / `ServiceKey`
- 실제 요청: `pageNo=1`, `numOfRows=10`, `type=json`; 이어서 2페이지 10건과 1페이지 100건으로 pagination 및 page size를 확인했습니다.
- 전체 snapshot: `pageNo=1..48`, `numOfRows=100`으로 순차 수집했습니다. 요청 사이에는 1초를 기다렸습니다.
- 첫 수집 전에 HTTP 응답을 받지 못한 추가 연결 시도 1회가 있었습니다. 성공한 응답은 탐색 요청 3건과 snapshot 48건, 총 51건입니다. 연결 시도가 API quota에 집계됐는지는 확인할 수 없습니다.
- HTTP: 모든 수집 페이지가 `200`, content type은 `application/json;charset=utf-8`, API `resultCode=00`, `resultMsg=NORMAL SERVICE.`였습니다.
- API 키는 해당 실행 프로세스의 환경변수로만 전달했습니다. 소스, raw, metadata, 콘솔 출력에는 키나 요청 URL의 query를 기록하지 않았습니다.
- 수집 시점의 응답 원문과 키 없는 metadata는 Git으로 버전관리되는 `back/data/raw/easy-drug/snapshot-2026-10-06T05-52-37.917Z/`에 있습니다.
- snapshot의 `snapshot-manifest.json`은 method, endpoint, 인증 parameter 이름, page range, page size, 시각 범위, status/result code를 기록하며 credential 값은 포함하지 않습니다.

## 관찰한 응답 구조

- Root envelope: `header`, `body`
- `header`: `resultCode`, `resultMsg`
- `body`: `pageNo`, `totalCount`, `numOfRows`, `items` (배열)
- 48페이지 모두 `totalCount=4,757`, `numOfRows=100`, 동일한 item 필드 집합을 반환했고, 마지막 페이지까지 4,757행을 받았습니다.
- 각 item에서 확인한 14개 필드: `entpName`, `itemName`, `itemSeq`, `efcyQesitm`, `useMethodQesitm`, `atpnWarnQesitm`, `atpnQesitm`, `intrcQesitm`, `seQesitm`, `depositMethodQesitm`, `openDe`, `updateDe`, `itemImage`, `bizrno`.
- `bizrno`는 제공된 response element 표에는 없지만 실제 4,757행 모두에서 확인했습니다. 의미가 별도 검증되지 않아 raw에는 보존하고 normalized 구조에서는 제외했습니다.
- 제공된 e약은요 API 상세 페이지의 “이용허락범위 제한 없음” 표기는 해당 API 데이터에 대한 포털 메타데이터입니다. 포털의 [공공데이터 이용정책](https://www.data.go.kr/ugs/selectPortalPolicyView.do)은 제3자 권리가 포함된 공공데이터는 권리자의 정당한 이용허락을 확보해야 한다고 안내합니다. 확인한 e약은요 공개 페이지에는 연결된 `itemImage` 파일의 별도 권리/재사용 허락이 적혀 있지 않아, 이미지 복제·저장·재배포 권한은 미확인으로 유지합니다.
- 모든 관찰 행에 위 필드가 있었고, 문항/이미지 필드는 JSON `null` 또는 문자열이었습니다. `itemImage`에는 `null` 1,989건과 빈 문자열 1건이 있었습니다.
- 2026-10-06에 [현재 API 상세 페이지](https://www.data.go.kr/data/15075057/openapi.do)를 다시 확인했습니다. 무료, 이용허락범위 제한 없음, 개발계정 일 10,000회이며 공개 response element에는 `itemImage`가 있고 `bizrno`는 없습니다. [포털 이용정책](https://www.data.go.kr/ugs/selectPortalPolicyView.do)은 제3자 권리 저작물에 별도 허락이 필요하다고 안내하므로, 이 API 이용허락만으로 연결 이미지의 복제·재배포 권리까지 확정하지 않았습니다.
- `itemSeq`는 4,757행 중 4,740개 unique; 14개 중복 group에서 초과 행 17건이 나왔습니다. 각 group은 `itemImage` 값만 달랐고 다른 관찰 필드는 같았습니다. 구성은 2행/서로 다른 URL인 group 10개, 3행/서로 다른 URL인 group 3개, 빈 이미지+URL인 2행 group 1개였습니다. 원본 행은 중복 제거 없이 모두 보존했습니다. 이 구조가 API가 의도한 다중 이미지인지 원인은 확인되지 않았습니다.

## Coverage (분모: 전체 응답 행 4,757)

| 항목 | 값 |
|---|---:|
| totalCount / downloadedRows | 4,757 / 4,757 |
| uniqueItemSeq / duplicate groups / duplicate rows | 4,740 / 14 / 17 |
| efcyCoverage | 4,747 / 4,757 (99.8%) |
| useMethodCoverage | 4,754 / 4,757 (99.9%) |
| warningCoverage | 1,153 / 4,757 (24.2%) |
| interactionCoverage | 3,302 / 4,757 (69.4%) |
| sideEffectCoverage | 4,523 / 4,757 (95.1%) |
| imageCoverage | 2,767 / 4,757 (58.2%) |
| updateDateRange | 2021-01-29 – 2026-10-02 |

이미지 값이 비어 있지 않은 2,767개는 HTTP(S) URL 문법에 맞고, 2,767개 모두 host는 `nedrug.mfds.go.kr`입니다. 2026-10-06 재현 표본 20개에 HTTP GET Range `bytes=0-0`을 보냈으나 20건 모두 DNS `ENOTFOUND`로 HTTP 응답을 받지 못했습니다. 따라서 이 실행 환경에서 host를 resolve하지 못했다는 점만 확인됐으며 개별 URL의 접근성이나 broken 비율은 여전히 **미측정**입니다. 재현기와 시도 리포트는 `sources/easy-drug/image-url-audit.ts`와 `back/data/reports/easy-drug/image-url-sample-2026-10-06-network-retry.json` (Git 제외)에 있습니다. 낱알식별 JOIN은 [Phase 3 분석](../PHASE3-OBSERVATIONS-2026-10-06.md)에서 exact `itemSeq === ITEM_SEQ`로 확인했습니다: e약은요 고유 ID 4,740개 중 2,751개(58.0%), 전체 4,757행 중 2,768행(58.2%)이 매칭됩니다. Coverage 리포트는 `back/data/reports/easy-drug/snapshot-2026-10-06T05-52-37.917Z-analysis.json`에 생성되며 Git에서 제외됩니다.

재현 가능한 spot check: 모집단은 해당 snapshot에서 비어 있지 않은 distinct `itemImage` URL(현재 2,767개)입니다. URL 문자열을 정렬한 뒤 균등 간격으로 20개를 선택합니다. 2xx와 image content type, 404/410, 401/403, 기타 HTTP 오류, redirect, DNS 및 timeout을 구분하고 404/410만 `broken`으로 셉니다. redirect는 최대 4번까지 같은 HTTPS host에서만 따라가며 다른 host로 나가는 redirect는 차단합니다. GET은 `Range: bytes=0-0`으로 요청하고 응답 첫 chunk만 읽은 뒤 취소하며, 이미지 원문은 저장하지 않습니다. 현재 실행은 20/20 DNS `ENOTFOUND`라 URL별 HTTP 결과가 없습니다. 이 20개는 재현 가능한 spot check일 뿐 모집단 비율을 추정하지 않습니다.

## 코드 경계와 다음 단계

- TypeScript client는 `ENCODED` 키를 한 번 decode한 뒤 `URLSearchParams`가 한 번 encode하도록 처리하고, 실패 메시지에서 query URL을 숨깁니다.
- Collector는 각 페이지 raw body를 변경 없이 저장하고, timestamp/HTTP status/content type/요청 pagination만 metadata로 남깁니다.
- 실제 포털 error response 경로는 아직 live 검증하지 못했습니다. fake-key probe가 `apis.data.go.kr` DNS `ENOTFOUND`로 응답 전에 종료되었습니다. 별도 가짜 response harness는 HTTP 200 / API `resultCode=30` body를 raw로 보존하고 credential marker를 metadata에 쓰지 않는 동작을 확인했지만, 원격 API 결과로 간주하지 않습니다.
- Validator와 types는 전체 4,757행에서 실제로 관찰한 구조를 기준으로 합니다. Normalizer는 빈 문자열과 null인 선택 문항을 내부 구조에서 `null`로 맞춥니다.
- 재현 표본 URL 확인 명령은 `back/node/`에서 `node -r ts-node/register ../data-poc/sources/easy-drug/image-url-audit.ts ..\\data\\raw\\easy-drug\\snapshot-2026-10-06T05-52-37.917Z 20`입니다. 최근 실행은 20건 모두 `network-error/ENOTFOUND`이며 HTTP 404/410 결과가 없어 접근성 판단은 계속 미완료입니다.
- 남은 항목은 네트워크가 허용된 환경에서 이미지 URL 재현 표본 접근성을 확인하고, `bizrno` 의미와 17건 중복 구조에 대한 제공기관 설명을 찾는 것입니다. 낱알식별 JOIN은 Phase 3에서 완료했으며 결과는 위 분석 기록을 참조합니다.
- Firestore schema, 추천/안전 규칙, 모델 및 UI 데이터 연결은 아직 확정하거나 구현하지 않았습니다.
