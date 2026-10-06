# 집약국 작업 인수인계

- [전체 남은 작업 체크리스트](TODO-ALL.md)
- [전체 단계와 완료 기준](ROADMAP.md)
- [현재 Phase 2 검증 세부표](TODO-PHASE2.md)
- [Phase 3 공식 API source 사전 조사](../back/data-poc/sources/PHASE3-SOURCE-INVENTORY-2026-10-06.md)
- [Phase 3 실제 응답·exact identifier JOIN 관찰](../back/data-poc/sources/PHASE3-OBSERVATIONS-2026-10-06.md)
- [Phase 4 Drug Master v1 산출 기록](../back/data-poc/sources/PHASE4-DRUG-MASTER-2026-10-06.md)
- [Phase 5 1,000개 표본 검증 기록](../back/data-poc/sources/PHASE5-SAMPLE-VALIDATION-2026-10-06.md)
- [Phase 6 효능 원문 검토 준비](../back/data-poc/sources/PHASE6-EFFICACY-EVIDENCE-2026-10-06.md)
- [사용자 제공 API 통합 명세 v2](../docs/JIBYAKGUK_API_SPEC_FOR_CODEX_v2.md)
- [버전관리 raw snapshot 및 출처/이용 조건](../back/data/raw/README.md)
- [e약은요 제공기관 미확인 질문 초안](OPEN-PROVIDER-QUESTIONS.md)

- 최초 작성: 2026-10-02 / 마지막 갱신: 2026-10-06 (Asia/Seoul)
- 현재 단계: **Phase 2 — e약은요 수집·coverage 완료, 이미지 표본은 20/20 DNS 오류라 HTTP 접근성 미측정, 권리/필드 의미 확인 잔여; Phase 3 — 제품허가·낱알식별 전체 수집과 exact JOIN 완료, HIRA/DUR 잔여; Phase 4 — Drug Master v1 생성; Phase 5 — 1,000개 표본 및 same-source 재생성 비교 완료, 날짜 간 delta 잔여; Phase 6 — 효능 원문 worklist 생성, 사람 검토/안전 질문 미착수**
- 저장소: `main`, 작업 시작 commit `12b183c`
- Git 인수인계 대상: 현재 구현·인수인계 문서와 2026-10-06 raw snapshots. generated normalized/report는 snapshot에서 로컬 재생성합니다.

## 현재 상태

Phase 1의 Frontend/NestJS/Python 앱 골격은 유지되고 있습니다. 2026-10-06에 e약은요 API 4,757행, 제품허가 42,709행/86페이지, 낱알식별 25,437행/51페이지, 안전상비약 13행을 실제 호출해 raw로 보존했습니다. e약은요 고유 `itemSeq` 4,740개 모두 제품허가와 exact match했고, 낱알식별과는 2,751개 exact match (58.0%)입니다. 전체 API 교차 분석, [Phase 4 Drug Master v1](../back/data-poc/sources/PHASE4-DRUG-MASTER-2026-10-06.md), [Phase 5 표본 검증](../back/data-poc/sources/PHASE5-SAMPLE-VALIDATION-2026-10-06.md), 전체 remaining은 각 기록을 참고하세요.

- `front/`: Vue 3 + TypeScript + Vite 7 앱 셸과 자리표시자 화면
- `back/node/`: NestJS 11 orchestration API 골격
- `back/python/`: FastAPI/Pydantic 앱 골격; ranking/question은 미구현
- `back/data-poc/sources/easy-drug/`: 실제 응답 기반 TypeScript client, collector, types, validator, normalizer, coverage, analyzer
- `back/data-poc/sources/phase4/drug-master.ts`: full snapshot 검증, exact ID 연결, source row provenance를 가진 Drug Master v1 생성기
- `back/data-poc/sources/phase3/hira_xml_parser.py`: HIRA XML raw 응답 및 별도 provenance의 user sample을 원문 필드명 유지해 파싱
- `back/data/raw/easy-drug/snapshot-2026-10-06T05-52-37.917Z/`: 48페이지 raw, key 없는 page metadata 및 aggregate `snapshot-manifest.json`
- `back/data/normalized/easy-drug/`와 `back/data/reports/easy-drug/`: 생성 데이터와 분석 JSON
- `back/data/normalized/drug-master/drug-master-v1-2026-10-06T07-06-28.503Z.json`: 현재 42,709개 Drug Master v1 (77,865,906 bytes, Git 제외); 재생성/검증은 [Phase 4 관찰](../back/data-poc/sources/PHASE4-DRUG-MASTER-2026-10-06.md)
- raw API snapshot은 다른 PC에서 재수집하지 않고 이어갈 수 있도록 Git으로 버전관리합니다. `.env`, normalized 파일, report는 계속 Git에서 제외하며 snapshot에서 다시 생성합니다. 출처별 이용 조건과 이미지 권리 범위는 [`back/data/raw/README.md`](../back/data/raw/README.md)를 참조하세요.

## Phase 2에서 확인된 결과

- API 문서 기준 `GET` endpoint / `ServiceKey` / `pageNo` / `numOfRows` / `type=json`을 실제 요청으로 확인
- HTTP `200`, content type `application/json;charset=utf-8`, `resultCode=00`
- 100행/page, 48페이지에서 `totalCount=downloadedRows=4,757`
- `itemSeq` 4,740 unique, 14개 중복 group의 초과 행 17건. 중복 group은 `itemImage`만 달라 의도 여부 확인이 남음
- 공식 e약은요 상세 페이지 response element 표에는 `itemImage`가 있고 `bizrno`는 없습니다. product permit와 4,757행 모두에서 `bizrno === BIZRNO`였지만 e약은요 공식 정의/사용범위가 미확인이라 normalized item에서는 계속 제외
- Coverage: 효능 99.8%, 용법 99.9%, 경고 24.2%, 상호작용 69.4%, 부작용 95.1%, image URL 값 58.2%
- 2,767개 이미지 값은 모두 같은 공식 호스트의 HTTP(S) URL입니다. 표본 20건을 요청했으나 로컬 DNS `ENOTFOUND`로 끝나 URL이 깨졌는지는 확인하지 못했습니다. 낱알식별 JOIN은 Phase 3 항목입니다.

2026-10-06에 [공식 API 상세](https://www.data.go.kr/data/15075057/openapi.do)에서 무료, 개발 quota 10,000/day, 이용허락범위 제한 없음을 확인했습니다. [포털 이용정책](https://www.data.go.kr/ugs/selectPortalPolicyView.do)은 제3자 권리 저작물에 별도 허락이 필요하다고 명시합니다. 성공 응답은 탐색 3회와 전체 snapshot 48회, 총 51건입니다. 응답을 받지 못한 연결 시도 1회가 quota에 집계됐는지는 확인하지 못했습니다. 이미지 자체의 재사용 권리는 이 API 페이지로 확정하지 않았습니다.

각 Phase 3 live 요청에서 `back/node/.env`의 service-key 설정을 사용했습니다. 변수 설정은 boolean으로만 확인했고 key 값은 읽거나 출력하지 않았습니다. `.env`는 Git에서 제외됩니다. 제품허가·낱알식별 `numOfRows=1000` error 응답은 실제 `resultCode=11`, maximum 500이었고 raw로 남겼습니다. HIRA 로컬 필터 요청은 HTTP 200/`resultCode=00`/`totalCount=0`이었습니다. 사용자가 동일한 네 필터값의 요청과 `totalCount=1` XML을 제공했으며, HTTP status는 확인되지 않아 user-provided와 local raw를 provenance로 분리했습니다.

## 집 PC에서 이어서 하기

1. `main`에서 push된 commit을 checkout/pull합니다. 이 commit에는 코드·문서와 현재 검증에 사용한 raw API snapshots가 함께 있으므로 기존 snapshot을 다시 수집할 필요가 없습니다.
2. `back/node/`에서 기존 `package-lock.json`에 따라 `npm ci`를 한 번 실행합니다. 이는 로컬 변환기를 준비하며 공식 API를 호출하지 않습니다.
3. [Data PoC README](../back/data-poc/README.md)의 Phase 4·6 및 HIRA exact-text comparison 명령으로 raw snapshot에서 Drug Master, efficacy worklist, 원문 lexical spans, 비교 report를 재생성합니다. 기존 API raw를 재수집하지 않습니다.
4. API를 새로 조사하거나 최신 snapshot이 필요한 작업에 한해서만 로컬 `.env`의 `DATA_GO_KR_SERVICE_KEY`를 사용합니다. 키를 Git, 문서, 로그, 채팅에 복사하지 않습니다.
5. 다음 미완료 사항을 처리하고 날짜별 이력은 [`daily/`](daily/README.md)에 새 날짜 파일로 남깁니다.

HIRA live probe는 로컬 `.env` key로 `numOfRows=10`, `pageNo=1`과 no-filter/공식 example/full example filters를 각각 요청했습니다. 로컬 응답은 HTTP 200 및 `resultCode=00`이지만 `totalCount=0`이었습니다. 사용자가 네 필터 요청값과 일치하는 XML `totalCount=1` response를 제공했습니다. 방금 같은 조건으로 project client를 재시도했으나 HTTP 응답 전에 fetch가 실패했고 raw capture는 없습니다. 다음에는 네트워크 응답이 가능한 환경에서 단건 요청을 재시도합니다.

이번 개발 실행에서는 `Resolve-DnsName` 호출이 `apis.data.go.kr`, `nedrug.mfds.go.kr` 모두 `access denied`를 반환했습니다. 이는 과거 API 요청의 `ENOTFOUND`와 구분되는 실행 환경 접근 제한이며 원격 endpoint나 이미지의 HTTP 상태를 나타내지 않습니다.

## 다음 작업 순서

1. 집 PC에서 이미 push된 raw를 사용해 normalized 데이터·worklist·HIRA exact-text comparison을 로컬 생성하며, 새 날짜 snapshot delta가 필요한지 판단
2. DNS/HTTPS가 되는 환경에서 [이미지 URL 표본 실행기](../back/data-poc/sources/easy-drug/image-url-audit.ts)를 실행해 HTTP status/content type을 분류; 과거 `ENOTFOUND`/이번 `access denied`는 URL별 HTTP 결과가 아님
3. 네트워크 응답이 가능한 환경에서 HIRA project client로 사용자의 네 필터 요청을 단건 재시도해 local raw response 확보; 이어 약가목록 API의 공식 operation/request contract를 확인해 `gnlNmCd` source와 결과 차이를 조사
4. DUR 활용신청 상태와 base URL/operation을 사용자 승인화면 또는 공식 Swagger에서 확인하고, source-specific 단건 raw response를 확보
5. 제공기관 공식 문서/답변으로 `bizrno` 의미 및 사용범위, e약은요 duplicate `itemSeq`의 multiple-image 관계, linked image rights 확인
6. 효능 span은 qualified human reviewer가 원문과 승인된 근거를 검토한 뒤에만 symptom ontology/question/safety rule로 진행; 그 이후 data contract, deterministic baseline, simulation, ML 검토, UI 연결

전체 단계와 이후 계획은 [ROADMAP.md](ROADMAP.md)에 있습니다. 계획에는 합의되지 않은 목표 날짜를 넣지 않았습니다.

## Phase 1 검증 기록

- 개발 환경: Node `22.14.0`, npm `10.9.2`, Python `3.11.9`
- 과거 확인: Frontend/NestJS typecheck, Python `compileall`/`pip check`, Vite와 backend health smoke check
- 이번 작업: e약은요 TypeScript 파일 대상 `tsc --noEmit` 통과
- 자동화 테스트, production build, Firebase 연결, 배포, 추천/안전 판단은 이번 작업에서 수행하지 않았습니다.
