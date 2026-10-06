# 집약국(JibYakGuk) API 통합 명세 — Codex용

> v2 보강일: 2026-10-06
> 추가 검증 자료: HIRA 공식 HWP, 안전상비의약품 공식 DOCX. 기존 v1 내용을 유지하면서 공식 원문의 제약·오류응답·검색조건·문서 불일치를 추가 반영함.

> 이 파일은 `00_START_HERE.md`부터 `07_missing_materials_and_next_steps.md`까지 합친 통합본이다.


---

# 집약국(JibYakGuk) API 자료 — Codex 시작 문서

검증일: 2026-10-06

이 문서는 사용자가 제공한 6개 압축파일의 실제 내용(공공데이터포털 승인 화면/요청 파라미터 화면, e약은요 공식 활용가이드)과 2026-10-06 현재 공공데이터포털 공식 공개 페이지를 대조하여 정리한 것이다.

## 0. Codex에 전달하기 전에 사용자가 맨 위에 붙일 값

아래 값만 채운 뒤 Codex에 전달한다. **실제 키를 README, Git, 로그, 테스트 fixture, 응답 예제에 남기지 않는다.**

```text
# === USER SECRET: DO NOT ECHO ===
DATA_GO_KR_SERVICE_KEY=<여기에 공공데이터포털 개발 인증키 붙여넣기>
DATA_GO_KR_SERVICE_KEY_FORMAT=ENCODED
# === END USER SECRET ===
```

현재 첨부 화면의 "일반 인증키"는 URL-encoded 형태로 표시되어 있으므로 기본값을 `ENCODED`로 둔다. Codex는 키를 출력하지 말고 `back/node/.env` 또는 실행 환경에만 저장한다. `.env`는 반드시 `.gitignore`에 포함한다.

### 인증키 인코딩 주의

- 공공데이터포털은 Encoding/Decoding 키를 제공할 수 있다.
- 이미 `%2F`, `%2B`, `%3D` 등이 포함된 `ENCODED` 키를 Axios/URLSearchParams에 그대로 넣으면 이중 인코딩될 수 있다.
- `DATA_GO_KR_SERVICE_KEY_FORMAT=ENCODED`이면 **정확히 한 번 decode한 값을 HTTP client의 query params에 넣어 client가 URL encoding하도록 한다.**
- `DECODED`이면 그대로 query params에 넣는다.
- 인증키 원문이나 변환 결과는 절대 로그에 출력하지 않는다.

## 1. 개발의 우선순위

```text
REQUEST
→ RAW RESPONSE 보존
→ 실제 응답 구조 확인
→ pagination/totalCount 확인
→ normalize
→ coverage
→ join 검증
→ Firestore 저장
```

문서에 존재하는 필드를 실제 응답 확인 전부터 Domain Model로 확정하지 않는다. 특히 현재 자료에서 **응답 스키마가 확보되지 않은 API는 `unknown`/raw transport로 먼저 수집**한다.

## 2. API 현황 요약

| # | API | 첨부자료 완성도 | Endpoint 확인 | Response schema 확인 | 개발 우선순위 |
|---|---|---|---|---|---|
| 1 | e약은요 | 높음: 공식 DOCX + 승인 화면 | 확인 | 확인 | 1 |
| 2 | 의약품 제품 허가정보 | 요청부 확인 | 확인 | **미확인** | 2 |
| 3 | DUR 품목정보 | 9개 operation 요청부 확인 | operation 확인, **base URL 추가 확인 필요** | **미확인** | 3 |
| 4 | 안전상비의약품 | **공식 DOCX + 요청 화면 + 공개 명세 확보** | 확인 | 확인 | 4 |
| 5 | 의약품 낱알식별 정보 | 요청부 확인 | 확인 | **미확인** | 5 |
| 6 | HIRA 의약품성분약효정보 | **공식 HWP + 요청 화면 + 공개 명세 확보** | 확인 | 확인 | 6 |

## 3. 중요한 발견

1. **e약은요 현재 공식 페이지의 인증키 파라미터명은 `ServiceKey`**이고, 첨부된 구형 DOCX v1.0에는 `serviceKey`로 적혀 있다. 현재 구현은 `ServiceKey`를 우선하되 실제 호출 결과를 보존한다.
2. **HIRA 의약품성분약효정보조회서비스는 현재 XML 전용**이다. JSON parser를 가정하지 않는다.
3. **안전상비의약품 응답에는 현재 공개 명세상 `itemSeq`가 없다.** 따라서 e약은요와의 직접 identifier join을 가정할 수 없다. 제품명/업체명 기반 후보 매핑 후 사람 검증 또는 별도 공식 bridge가 필요하다.
4. 의약품 제품 허가정보는 현재 승인 화면 기준 **Service08**이다. 인터넷의 `Service06/07` 예제를 복사하지 않는다.
5. DUR 화면에는 9개 operation이 확인되지만, 첨부 압축에 서비스 Base URL/응답 element가 없다. Base URL을 추측해서 코드에 넣지 않는다.
6. HIRA 서비스 설명 자체가 `gnlNmCd`를 얻기 위해 **건강보험심사평가원 약가기준정보조회서비스**를 참조하라고 안내한다. HIRA ↔ 제품 bridge 검증을 위해 추가 신청 후보로 본다.
7. HIRA 공식 HWP(v1.1, 2016-12-08)는 `gnlNmCd`, `gnlNm`, `meftDivNo`, `divNm` 중 **4개 검색조건 가운데 최소 1개를 사용해야 하는 것으로 명시**한다. 무조건 전체 목록 무필터 호출이 가능하다고 가정하지 않는다.
8. HIRA 공식 HWP는 최대 메시지 6000bytes, 평균 응답 500ms, 최대 30TPS를 명시한다. 실제 운영 제한은 현재 포털/실제 응답을 우선하되 수집기는 30TPS를 넘지 않도록 보수적으로 설계한다.
9. 안전상비 공식 DOCX(v1.0)은 최대 메시지 4000bytes, 평균 응답 500ms, 최대 30TPS를 명시한다.
10. HIRA/안전상비의 구형 공식 가이드는 데이터 갱신주기를 `일 1회`로 적고 있으나, 현재 공공데이터포털 화면은 `실시간`으로 표시될 수 있다. **현재 운영 메타데이터는 최신 포털을 우선**, 구형 가이드는 transport/schema/제약 참고자료로 취급한다.

## 4. 공통 오류 처리

공공데이터포털 공식 페이지에서 확인되는 공통 오류 예시는 다음과 같다.

| 코드 | 의미 |
|---|---|
| 01 | APPLICATION_ERROR |
| 04 | HTTP_ERROR |
| 05 | SERVICETIMEOUT_ERROR |
| 10 | INVALID_REQUEST_PARAMETER_ERROR |
| 12 | NO_OPENAPI_SERVICE_ERROR |
| 20 | SERVICE_KEY_IS_NULL / PERMISSION_DENIED / SERVICE_ACCESS_DENIED_ERROR |
| 22 | 일일 호출 허용량 초과 |
| 23 | 초당 호출 허용량 초과 |
| 29 | BLACKLIST_IP_ACCESS_ERROR |
| 30 | SERVICE_KEY_IS_NOT_REGISTERED_ERROR |
| 31 | DEADLINE_HAS_EXPIRED_ERROR |

HTTP 200만 성공으로 판단하지 말고 응답 내부의 `resultCode`/`resultMsg`도 검사한다.

## 5. Codex가 첫 실행에서 해야 할 것

1. `DATA_GO_KR_SERVICE_KEY`를 출력하지 않고 읽는다.
2. e약은요에 `pageNo=1`, `numOfRows=10`, `type=json`으로 실제 요청한다.
3. URL/로그에는 인증키를 `***`로 마스킹한다.
4. RAW response를 timestamp와 함께 `back/data/raw/easy-drug/`에 저장한다.
5. `resultCode`, `resultMsg`, `totalCount`, `pageNo`, `numOfRows`, `items` 실제 구조를 보고한다.
6. 문서와 실제 응답이 다르면 실제 응답을 우선한다.
7. 성공 전에는 다른 API 전체수집이나 Firestore schema 확정을 하지 않는다.

세부 API 명세는 01~06 문서를 따른다.

---

# 01. 식품의약품안전처 — 의약품개요정보(e약은요)

## 검증 근거

- 사용자 첨부: `IROS_239_의약품개요정보(e약은요) 서비스_v1.0.docx`
- 사용자 첨부: 2026-10-06 승인/상세기능 스크린샷
- 공식 페이지: https://www.data.go.kr/data/15075057/openapi.do

## 현재 공식 메타데이터

- REST
- JSON + XML
- 무료
- 업데이트 주기: 실시간
- 이용허락범위: 제한 없음
- 개발단계: 자동승인
- 운영단계: 심의승인
- 개발계정 트래픽: 10,000/day

## Endpoint

```text
Service URL
https://apis.data.go.kr/1471000/DrbEasyDrugInfoService

GET
https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList
```

## 요청 파라미터

현재 공식 페이지 기준이다.

| 이름 | 필수 | 설명 |
|---|---:|---|
| `ServiceKey` | Y | 공공데이터포털 인증키. 현재 공식 페이지 표기 |
| `pageNo` | N | 페이지 번호 |
| `numOfRows` | N | 한 페이지 결과 수 |
| `entpName` | N | 업체명 |
| `itemName` | N | 제품명 |
| `itemSeq` | N | 품목기준코드 |
| `efcyQesitm` | N | 효능 문항 검색 |
| `useMethodQesitm` | N | 사용법 문항 검색 |
| `atpnWarnQesitm` | N | 주의사항 경고 문항 검색 |
| `atpnQesitm` | N | 주의사항 검색 |
| `intrcQesitm` | N | 상호작용 검색 |
| `seQesitm` | N | 부작용 검색 |
| `depositMethodQesitm` | N | 보관법 검색 |
| `openDe` | N | 공개일자 |
| `updateDe` | N | 수정일자 |
| `type` | N | `xml`/`json`, default `xml` |

### 문서 불일치

첨부 DOCX v1.0은 인증키를 `serviceKey`로 표기하지만 2026-10-06 현재 공식 페이지와 첨부 승인 화면은 `ServiceKey`로 표시한다. **코드에서는 현재 공식 표기 `ServiceKey`를 사용하고 실제 요청 결과로 검증한다.**

## 공식 Response Element

| 이름 | 설명 |
|---|---|
| `resultCode` | 결과코드 |
| `resultMsg` | 결과메시지 |
| `numOfRows` | 한 페이지 결과 수 |
| `pageNo` | 페이지 번호 |
| `totalCount` | 전체 결과 수 |
| `entpName` | 업체명 |
| `itemName` | 제품명 |
| `itemSeq` | 품목기준코드 |
| `efcyQesitm` | 효능 |
| `useMethodQesitm` | 사용법 |
| `atpnWarnQesitm` | 주의사항 경고 |
| `atpnQesitm` | 주의사항 |
| `intrcQesitm` | 상호작용 |
| `seQesitm` | 부작용 |
| `depositMethodQesitm` | 보관법 |
| `openDe` | 공개일자 |
| `updateDe` | 수정일자 |
| `itemImage` | 낱알이미지 URL, optional |

## 최초 PoC 요청

```http
GET /1471000/DrbEasyDrugInfoService/getDrbEasyDrugList
  ?ServiceKey=<SECRET>
  &pageNo=1
  &numOfRows=10
  &type=json
```

Codex는 URL 전체를 로그에 남기지 않는다. 남길 경우 `ServiceKey=***`로 마스킹한다.

## PoC에서 반드시 측정할 항목

```text
totalCount
downloadedRows
uniqueItemSeq
duplicates

efcyCoverage
useMethodCoverage
warningCoverage
interactionCoverage
sideEffectCoverage
imageCoverage

updateDateRange
```

이미지:

```text
totalProducts
itemImagePresent
itemImageMissing
validImageUrl
brokenImageUrl
```

## Join 관점

`itemSeq`가 집약국 MFDS 계열의 1차 join 후보다. 그러나 다른 API와의 전체 coverage를 측정하기 전에는 "모두 itemSeq로 연결된다"고 확정하지 않는다.

---

# 02. 식품의약품안전처 — 의약품 제품 허가정보

## 검증 근거

- 사용자 첨부: 2026-10-06 개발계정 승인 화면 4장
- 공식 페이지: https://www.data.go.kr/data/15095677/openapi.do

## 현재 공식 메타데이터

- REST
- JSON + XML
- 무료
- 업데이트 주기: 실시간
- 이용허락범위: 제한 없음
- 개발단계: 자동승인
- 운영단계: 심의승인
- 개발계정 트래픽: 10,000/day
- 공식 페이지 수정일: 2026-09-18

## Service URL — 첨부 승인 화면에서 확인

```text
https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService08
```

인터넷의 구형 `Service06`, `Service07` 예제를 사용하지 않는다.

## Operation 1 — 의약품 제품 허가 목록

```text
GET /getDrugPrdtPrmsnInq08
```

첨부 화면에 표시된 Request Parameter 이름 그대로:

```text
serviceKey
pageNo
numOfRows
type
induty
spclty_pblc
prdlst_Stdr_code
entp_name
prduct_prmisn_no
item_name
entp_seq
entp_no
edi_code
item_ingr_name
bizrno
```

의미:

```text
induty             업종
spclty_pblc        전문/일반구분
prdlst_Stdr_code   품목일련번호
entp_name          업체명
prduct_prmisn_no   품목허가번호
item_name          품목명
entp_seq           업일련번호
entp_no            업허가번호
edi_code           보험코드
item_ingr_name     주성분
bizrno             사업자등록번호
```

## Operation 2 — 의약품 제품 허가 상세정보

```text
GET /getDrugPrdtPrmsnDtlInq08
```

Request Parameter:

```text
serviceKey
pageNo
numOfRows
type
item_name
entp_name
item_permit_date
entp_no
bar_code
item_seq
start_change_date
end_change_date
edi_code
atc_code
bizrno
rare_drug_yn
main_item_ingr
```

중요 후보:

```text
item_seq        품목기준코드
main_item_ingr  유효성분
atc_code        ATC코드
rare_drug_yn    희귀의약품여부
```

## Operation 3 — 의약품 제품 주성분 상세정보

```text
GET /getDrugPrdtMcpnDtlInq08
```

첨부 화면에 표시된 **대소문자 포함 이름 그대로**:

```text
serviceKey
pageNo
numOfRows
type
Entrps_prmisn_no
Entrps
Item_seq
Prduct
Bizrno
```

### 주의

Operation 3의 포털 샘플 값은 필드 설명과 의미가 맞지 않아 보이는 항목이 있다. 예를 들어 `Item_seq`/`Prduct`의 샘플이 설명과 일치하지 않는 정황이 있으므로 **샘플 값으로 타입이나 join 규칙을 만들지 않는다. 실제 RAW Response를 우선한다.**

## 현재 자료에서 미확인인 것

첨부파일에는 **Response Element 정의와 실제 Raw Response가 없다.** 따라서 Codex는 위 operation의 Response DTO를 추측해서 만들지 않는다.

첫 요청은 다음처럼 최소 파라미터로 수행한다.

```text
serviceKey=<SECRET>
pageNo=1
numOfRows=10
type=json
```

각 operation의 RAW Response를 별도 파일로 저장한 후 Response schema를 확정한다.

## Join PoC 핵심

1. e약은요 `itemSeq` ↔ 허가 상세 `item_seq` exact match 여부
2. 허가목록/상세/주성분 상세 사이의 identifier 관계
3. `main_item_ingr`/주성분 상세가 실제 추천용 ingredient master로 사용할 수 있는지
4. missing/duplicate coverage

---

# 03. 식품의약품안전처 — 의약품안전사용서비스(DUR) 품목정보

## 검증 근거

- 사용자 첨부: 2026-10-06 상세기능 화면 9장
- 공식 페이지: https://www.data.go.kr/data/15059486/openapi.do

## 현재 공식 메타데이터

- REST
- JSON + XML
- 무료
- 업데이트 주기: 실시간
- 이용허락범위: 제한 없음
- 개발단계: 자동승인
- 운영단계: 자동승인
- 개발계정 트래픽: 10,000/day
- 공식 페이지 수정일: 2025-09-16

## 중요: Base URL

**현재 첨부 압축에는 DUR 서비스의 Base URL이 보이는 상단 서비스 정보 화면이 없다.**

따라서 Codex는 서비스명을 추측하여 hard-code하지 않는다.

```text
DUR_SERVICE_BASE_URL=<공공데이터포털 승인 화면/공식 Swagger에서 추가 확인 필요>
```

아래 operation path는 첨부 화면에서 직접 확인했다.

## Operation 목록

| # | 기능 | Operation |
|---|---|---|
| 1 | 병용금기 정보조회 | `/getUsjntTabooInfoList03` |
| 2 | 노인주의 정보조회 | `/getOdsnAtentInfoList03` |
| 3 | DUR품목정보 조회 | `/getDurPrdlstInfoList03` |
| 4 | 특정연령대금기 정보조회 | `/getSpcifyAgrdeTabooInfoList03` |
| 5 | 용량주의 정보조회 | `/getCpctyAtentInfoList03` |
| 6 | 투여기간주의 정보조회 | `/getMdctnPdAtentInfoList03` |
| 7 | 효능군중복 정보조회 | `/getEfcyDplctInfoList03` |
| 8 | 서방정분할주의 정보조회 | `/getSeobangjeongPartitnAtentInfoList03` |
| 9 | 임부금기 정보조회 | `/getPwnmTabooInfoList03` |

모든 operation의 화면상 일일 트래픽은 10,000이다.

## 공통 Request Parameter 패턴

대부분 operation에서 확인:

```text
serviceKey
pageNo
numOfRows
type
```

추가 검색 필드로 다음이 반복된다.

```text
typeName           DUR유형
ingrCode           DUR성분코드
itemName           품목명
start_change_date  변경일자
end_change_date    변경일자
itemSeq            품목기준코드
bizrno             사업자등록번호 (일부 operation)
entpName           업체명 (일부 operation)
```

## Operation별 화면 확인 Request Parameter

### 1. 병용금기 `/getUsjntTabooInfoList03`

```text
serviceKey, pageNo, numOfRows, type,
typeName, ingrCode, itemName,
start_change_date, end_change_date,
itemSeq, bizrno
```

### 2. 노인주의 `/getOdsnAtentInfoList03`

```text
serviceKey, pageNo, numOfRows, type,
typeName, ingrCode, itemName,
start_change_date, end_change_date,
itemSeq
```

### 3. DUR품목정보 `/getDurPrdlstInfoList03`

화면에 `itemSeq`가 상단과 하단에 **중복 표시**되어 있다.

```text
itemSeq,
serviceKey, pageNo, numOfRows, type,
itemName, entpName,
start_change_date, end_change_date,
itemSeq,
bizrno
```

이 중복은 포털 UI/명세 문제일 수 있으므로 실제 요청/응답으로 확인한다. 코드에 같은 query key를 두 번 넣지 않는다.

### 4. 특정연령대금기 `/getSpcifyAgrdeTabooInfoList03`

```text
serviceKey, pageNo, numOfRows, type,
typeName, ingrCode, itemName,
start_change_date, end_change_date,
itemSeq
```

### 5. 용량주의 `/getCpctyAtentInfoList03`

```text
serviceKey, pageNo, numOfRows, type,
typeName, ingrCode, itemName,
start_change_date, end_change_date,
itemSeq
```

### 6. 투여기간주의 `/getMdctnPdAtentInfoList03`

```text
serviceKey, pageNo, numOfRows, type,
typeName, ingrCode, itemName,
start_change_date, end_change_date,
itemSeq
```

### 7. 효능군중복 `/getEfcyDplctInfoList03`

```text
serviceKey, pageNo, numOfRows, type,
typeName, ingrCode, itemName,
start_change_date, end_change_date,
itemSeq, bizrno
```

### 8. 서방정분할주의 `/getSeobangjeongPartitnAtentInfoList03`

```text
serviceKey, pageNo, numOfRows, type,
typeName, itemName, entpName,
start_change_date, end_change_date,
itemSeq, bizrno
```

### 9. 임부금기 `/getPwnmTabooInfoList03`

```text
serviceKey, pageNo, numOfRows, type,
typeName, ingrCode, itemName,
start_change_date, end_change_date,
itemSeq
```

## 현재 자료에서 미확인인 것

- Service Base URL
- 각 operation의 Response Element 이름/타입
- 실제 JSON/XML wrapper 구조
- `itemSeq`가 모든 record에 존재하는 coverage
- 병용금기가 한 record에 두 품목/성분을 어떤 필드로 표현하는지

따라서 Safety Engine을 지금 만들지 않는다. 먼저 9개 operation 각각 `pageNo=1`, 작은 `numOfRows`, 가능하면 `type=json`으로 RAW Response를 확보한다.

## DUR PoC에서 반드시 산출

```text
operation별 totalCount
operation별 downloadedRows
itemSeqPresentCoverage
ingrCodePresentCoverage
duplicateRows
unmatchedToDrugMaster
joinCoverage
```

특히 병용금기는 단순 `itemSeq → 금기 true` 구조라고 가정하지 않는다. 실제 상대 성분/상대 품목 구조를 RAW로 확인한 후 모델링한다.

---

# 04. 식품의약품안전처 — 안전상비의약품 정보

## 검증 근거

- 사용자 첨부: 2026-10-06 개발계정 승인 화면 2장
- 공식 페이지: https://www.data.go.kr/data/15097208/openapi.do

## 현재 공식 메타데이터

- REST
- JSON + XML
- 무료
- 업데이트 주기: 실시간
- 이용허락범위: 제한 없음
- 개발단계: 자동승인
- 운영단계: 심의승인
- 개발계정 트래픽: 10,000/day

## Endpoint

```text
Service URL
https://apis.data.go.kr/1471000/SafeStadDrugService

GET
https://apis.data.go.kr/1471000/SafeStadDrugService/getSafeStadDrugInq
```

## Request Parameter

| 이름 | 필수 | 설명 |
|---|---:|---|
| `serviceKey` | Y | 인증키 |
| `pageNo` | N | 페이지 번호 |
| `numOfRows` | N | 한 페이지 결과 수 |
| `type` | N | xml/json, default xml |
| `PRDLST_NM` | N | 제품명 |
| `BSSH_NM` | N | 업체명 |

## 공식 Response Element

| 이름 | 설명 |
|---|---|
| `resultCode` | 결과코드 |
| `resultMsg` | 결과메시지 |
| `numOfRows` | 한 페이지 결과 수 |
| `pageNo` | 페이지 번호 |
| `totalCount` | 전체 결과 수 |
| `PRDLST_NM` | 제품명 |
| `BSSH_NM` | 업체명 |
| `VLD_PRD_YMD` | 유효기간 |
| `STRG_MTH_CONT` | 저장방법 |

공식 샘플 `totalCount`는 13이지만 실제 호출의 현재 값을 기준으로 한다.

## 공식 DOCX에서 추가 확인된 운영/Transport 정보

사용자 추가 첨부 공식 가이드 `IROS_409_안전상비의약품 정보_v1.0.docx`에서 다음이 확인된다.

```text
서비스 ID: SafeStadDrugService
인터페이스: REST GET
지원 포맷: XML + JSON
가이드상 Service URL: http://apis.data.go.kr/1471000/SafeStadDrugService
최대 메시지 사이즈: 4000bytes
평균 응답 시간: 500ms
초당 최대 트랜잭션: 30TPS
가이드상 데이터 갱신주기: 일 1회
```

현재 구현의 endpoint scheme은 최신 포털에서 확인한 `https://apis.data.go.kr/...`를 우선한다.
구형 가이드의 `http://` 표기를 최신 운영 endpoint로 되돌리지 않는다.

### 공식 DOCX 오류 응답 주의

공공데이터포털 레벨 오류는 정상 API body와 다른 XML wrapper로 반환될 수 있다.

예:

```xml
<OpenAPI_ServiceResponse>
  <cmmMsgHeader>
    <errMsg>SERVICE ERROR</errMsg>
    <returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg>
    <returnReasonCode>30</returnReasonCode>
  </cmmMsgHeader>
</OpenAPI_ServiceResponse>
```

따라서 client는 다음 두 가지를 모두 처리한다.

```text
A. 정상 service response
   response.header.resultCode / resultMsg

B. 공공데이터포털 gateway 오류
   OpenAPI_ServiceResponse.cmmMsgHeader
```

공식 가이드에서 확인된 주요 오류 예:

```text
1   APPLICATION_ERROR
12  NO_OPENAPI_SERVICE_ERROR
20  SERVICE_ACCESS_DENIED_ERROR
22  LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR
30  SERVICE_KEY_IS_NOT_REGISTERED_ERROR
31  DEADLINE_HAS_EXPIRED_ERROR
32  UNREGISTERED_IP_ERROR
99  UNKNOWN_ERROR

제공기관:
10  INVALID_REQUEST_PARAMETER_ERROR
```

## 매우 중요한 Join 제약

현재 공식 Response Element에는 **`itemSeq`/품목기준코드가 없다.**

따라서 다음을 금지한다.

```text
안전상비 API 제품명 == e약은요 제품명
→ 무조건 같은 제품으로 자동 확정
```

권장 PoC:

1. 안전상비 전체 목록 수집
2. `PRDLST_NM + BSSH_NM`으로 Drug Master 후보 생성
3. MFDS 허가정보에서 동일 제품을 찾을 수 있는 공식 identifier bridge가 있는지 확인
4. 없으면 소수 품목이므로 human-verified mapping table을 별도로 관리
5. mapping source/method/reviewedAt를 저장

`편의점 구매 가능` 표시는 이 매핑을 통과한 제품에만 부여한다.

---

# 05. 식품의약품안전처 — 의약품 낱알식별 정보

## 검증 근거

- 사용자 첨부: 2026-10-06 개발계정 승인 화면 2장
- 공식 페이지: https://www.data.go.kr/data/15057639/openapi.do

## 현재 공식 메타데이터

- REST
- JSON + XML
- 무료
- 업데이트 주기: 실시간
- 이용허락범위: 제한 없음
- 개발단계: 자동승인
- 운영단계: 자동승인
- 개발계정 트래픽: 10,000/day

공식 데이터 설명상 품목기준코드, 품목명, 업체명, 사업자등록번호, 의약품 모양/색 등의 낱알 식별정보를 제공한다. 단, **모양/색의 실제 Response field 이름은 현재 첨부자료에서 확인되지 않았다.**

## Endpoint — 첨부 승인 화면에서 확인

```text
Service URL
https://apis.data.go.kr/1471000/MdcinGrnIdntfcInfoService03

GET
https://apis.data.go.kr/1471000/MdcinGrnIdntfcInfoService03/getMdcinGrnIdntfcInfoList03
```

## Request Parameter — 첨부 화면 기준

```text
serviceKey
pageNo
numOfRows
type
item_name
entp_name
item_seq
img_regist_ts
edi_code
bizrno
```

의미:

```text
item_name      품목명
entp_name      업체명
item_seq       품목일련번호/화면상 품목 식별값
img_regist_ts  약학정보원 이미지 생성일
edi_code       보험코드
bizrno         사업자등록번호
```

## 현재 자료에서 미확인인 것

- Response Element의 실제 field 이름 전체
- 모양, 색, 각인, 분할선, 이미지 URL 등의 실제 field명/nullable 여부
- `item_seq`가 e약은요 `itemSeq`와 의미/값이 동일한지 exact join coverage

따라서 Codex는 예상되는 모양/색 필드를 임의 이름으로 만들지 않는다.

첫 호출 후 RAW Response에서 실제 schema를 확정한다.

## PoC 핵심

```text
totalCount
itemSeq/item_seq coverage
e약 itemSeq exact join coverage
shape coverage
color coverage
imprint coverage
image-related coverage
```

공식 이미지가 없는 e약 제품의 fallback 후보로 사용하기 전에 실제 join과 field coverage를 먼저 측정한다.

---

# 06. 건강보험심사평가원 — 의약품성분약효정보조회서비스

## 검증 근거

- 사용자 첨부: 2026-10-06 개발계정 승인 화면 2장
- 사용자 첨부 공식 원문: `OpenAPI활용가이드_건강보험심사평가원(의약품성분약효정보조회서비스).hwp`
  - 최초 1.0: 2016-11-30
  - 개정 1.1: 2016-12-08
- 공식 페이지: https://www.data.go.kr/data/15021027/openapi.do

## 현재 공식 메타데이터

- REST
- **XML only**
- 무료
- 업데이트 주기: 실시간 *(현재 포털 기준; 2016 공식 HWP는 `일 1회`로 기재되어 있어 최신 포털을 우선)*
- 이용허락범위: **공공저작물 출처표시 제1유형**
- 개발단계: 자동승인
- 운영단계: 자동승인
- 개발계정 트래픽: 10,000/day

## Endpoint

```text
Service URL
https://apis.data.go.kr/B551182/msupCmpnMeftInfoService

GET
https://apis.data.go.kr/B551182/msupCmpnMeftInfoService/getMajorCmpnNmCdList
```

## Request Parameter

| 이름 | 필수 | 설명 |
|---|---:|---|
| `ServiceKey` | Y | 인증키 |
| `numOfRows` | Y | 한 페이지 결과 수 |
| `pageNo` | Y | 페이지 번호 |
| `gnlNmCd` | 조건부 | 일반명코드. 공식 HWP 검색 유형 `A%`, 9자리 이상 입력 불가 |
| `gnlNm` | 조건부 | 일반명. 공식 HWP 검색 유형 `%A%` |
| `meftDivNo` | 조건부 | 약효분류번호. 공식 HWP 검색 유형 `A%`, 3자리 이상 입력 불가 |
| `divNm` | 조건부 | 약효분류명. 공식 HWP 검색 유형 `%A%` |

주의:

- 다른 MFDS API와 달리 `ServiceKey`의 S/K가 대문자로 공식 표기되어 있다.
- 공식 HWP에는 `gnlNmCd`, `gnlNm`, `meftDivNo`, `divNm` **4개 조건 중 하나는 필수**라고 기재되어 있다.
- 따라서 `pageNo/numOfRows`만 넣은 전체 목록 호출이 반드시 허용된다고 가정하지 않는다.
- 전체 수집 필요 시 실제 API가 어떤 검색조건을 허용하는지 먼저 소량 호출로 확인한다.

## 공식 Response Element

| 이름 | 필수 | 설명 |
|---|---:|---|
| `resultCode` | Y | 결과코드 |
| `resultMsg` | Y | 결과메시지 |
| `numOfRows` | Y | 한 페이지 결과 수 |
| `pageNo` | Y | 페이지 번호 |
| `totalCount` | Y | 총건수 |
| `divNm` | N | 약효분류명 |
| `fomnTpNm` | N | 제형구분명 |
| `gnlNm` | Y | 일반명 |
| `gnlNmCd` | Y | 일반명코드/주성분코드 |
| `injcPthNm` | N | 투여경로명 |
| `iqtyTxt` | N | 함량내용 |
| `meftDivNo` | N | 약효분류번호 |
| `unit` | N | 단위 |

## 구현 주의

- `type=json`을 붙이지 않는다. 공식 HWP의 교환 데이터 표준은 XML only다.
- XML parser를 별도 transport layer로 둔다.
- `gnlNmCd`는 MFDS `itemSeq`와 다른 identifier다.
- 공식 HWP의 서비스 제약:
  - 최대 메시지 사이즈: `6000bytes`
  - 평균 응답 시간: `500ms`
  - 초당 최대 트랜잭션: `30TPS`
  - 가이드상 데이터 갱신주기: `일 1회`
- 최신 포털의 현재 메타데이터가 구형 HWP와 다르면 **최신 포털/실제 API 동작을 우선**한다.
- 수집기는 보수적으로 30TPS 이하로 유지하고, 실제 공공데이터포털 일일 quota도 별도로 지킨다.

### 공식 HWP 내부 필드명 불일치

Response Element 표에는 다음 이름이 정의되어 있다.

```text
fomnTpNm
injcPthNm
```

그러나 공식 HWP의 두 번째 XML 샘플에는 다음과 같은 다른 이름이 등장한다.

```text
fomnTpCdNm
injcPthCdNm
```

따라서 XML parser에서 샘플 하나를 기준으로 DTO를 확정하지 않는다.

첫 실제 RAW Response에서 실제 element명을 확인하고,
필요하면 transport parser 수준에서 alias를 허용하되 Domain Model은 하나의 표준 이름으로 normalize한다.

### HIRA 검색코드 출처

공식 HWP는 `gnlNmCd`와 `meftDivNo`의 별도 코드정보를 이 서비스에서 제공하지 않으며,
건강보험심사평가원 `약가기준정보조회서비스 > 약가목록조회`의 응답 값을 상세조회 조건으로 사용할 수 있다고 명시한다.

## 추가 bridge가 필요한 이유

현재 HIRA 공식 설명은 `gnlNmCd`가 건강보험심사평가원의 **약가기준정보조회서비스**의 `약가목록조회` 응답에서 확인 가능하다고 명시한다.

추가 신청 후보:

```text
건강보험심사평가원_약가기준정보조회서비스
https://www.data.go.kr/data/15054445/openapi.do
```

현재 공식 메타데이터:

```text
XML
무료
실시간
개발/운영 자동승인
개발 10,000/day
출처표시 제1유형
```

단, 이 추가 API가 MFDS `itemSeq`까지 직접 bridge하는지는 아직 확인하지 않았다. 승인/응답을 받은 뒤 실제 field를 보고 판단한다.

---

# 07. 추가로 필요한 자료와 다음 행동

현재 6개 압축파일은 **API 신청/요청 파라미터 확인에는 충분하지만 모든 API의 Response DTO를 정확히 구현하기에는 부족하다.**

## A. 가장 먼저 필요한 것 — 개발키

사용자가 Codex 프롬프트 맨 위에 다음만 채운다.

```text
DATA_GO_KR_SERVICE_KEY=<개발 인증키>
DATA_GO_KR_SERVICE_KEY_FORMAT=ENCODED
```

키는 이 문서/Repository에 실제 값으로 넣지 않는다.

## B. 추가 첨부를 권장하는 공식 자료

### 1. 의약품 제품 허가정보

현재 압축에는 Request 화면만 있다.

가능하면 공공데이터포털에서 각 operation의:

```text
출력결과(Response Element)
미리보기 Raw Response
```

를 추가로 캡처/저장한다.

대상:

```text
getDrugPrdtPrmsnInq08
getDrugPrdtPrmsnDtlInq08
getDrugPrdtMcpnDtlInq08
```

### 2. DUR 품목정보 — 최우선 추가자료

다음이 필요하다.

```text
서비스 정보 화면의 End Point / Service URL
9개 operation의 Response Element
각 operation 최소 1건 Raw Response
```

특히 병용금기의 상대 성분/상대 품목 구조가 Safety Engine 설계에 필수다.

### 3. 낱알식별정보

현재 압축에는 Request 화면만 있다.

필요:

```text
Response Element 전체
Raw Response 1페이지
```

모양/색/각인/분할선/이미지 관련 정확한 field명을 확인해야 한다.

### 4. 안전상비의약품 공식 가이드 DOCX — 확보 완료

다음 공식 원문을 사용자로부터 추가 확보했다.

```text
IROS_409_안전상비의약품 정보_v1.0.docx
```

추가 반영 완료:

```text
REST GET
XML/JSON
30TPS
최대 메시지 4000bytes
공공데이터포털 gateway 오류 XML
제공기관 INVALID_REQUEST_PARAMETER_ERROR
구형 가이드상 일 1회 갱신 표기
```

### 5. HIRA 공식 HWP — 확보 완료

다음 공식 원문을 사용자로부터 추가 확보했다.

```text
OpenAPI활용가이드_건강보험심사평가원(의약품성분약효정보조회서비스).hwp
```

추가 반영 완료:

```text
REST GET
XML only
검색조건 4개 중 최소 1개 필요
검색 패턴(A% / %A%)
30TPS
최대 메시지 6000bytes
평균 응답 500ms
구형 가이드상 일 1회 갱신
약가기준정보조회서비스 bridge 설명
공식 HWP 내부 response element 샘플명 불일치
```

## C. 추가 API 신청 권장 — HIRA bridge

공식 HIRA 성분약효 API 설명 때문에 다음 API는 추가 신청 가치가 높다.

```text
건강보험심사평가원_약가기준정보조회서비스
https://www.data.go.kr/data/15054445/openapi.do
```

목적:

```text
제품/약가 마스터에서 gnlNmCd(일반명코드) 확보 가능성 검증
→ HIRA 성분약효정보와 연결
```

단, MFDS `itemSeq`와 직접 연결 가능하다고 아직 단정하지 않는다.

## D. 지금부터의 실제 실행 순서

```text
1. 개발키를 Codex에 비공개로 전달
2. e약은요 10건 호출
3. RAW Response 저장
4. totalCount 확인
5. e약 전체 pagination/coverage
6. 제품 허가정보 3 operation 각각 RAW 확보
7. e약 itemSeq ↔ 허가정보 exact join 측정
8. DUR Base URL 확인 + 9 operation RAW 확보
9. DUR join 구조 결정
10. 안전상비 전체 수집 및 identifier 부재 처리
11. 낱알식별 RAW/response schema 확인
12. HIRA XML 수집
13. HIRA bridge API 추가 검토
```
