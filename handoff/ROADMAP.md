# 집약국(JibYakGuk) 전체 개발 계획

- 계획 기준일: 2026-10-02 (Asia/Seoul)
- 마지막 재점검: 2026-10-06 (Asia/Seoul)
- 기준 문서: 사용자가 제공한 「집약국 전체 프로젝트 개발 지침」
- 일정: 별도 합의 전까지 시작일/목표일은 미정
- 상태와 날짜 이력: [`daily/`](daily/README.md)의 `YYYY-MM-DD.md` 작업 기록에서 관리

이 문서는 프로젝트 전체의 단계, 선행 조건, 완료 기준을 설명합니다. 지금 남은 실행 항목은 [`TODO-ALL.md`](TODO-ALL.md)에 단계별 체크리스트로 모읍니다. 개별 날짜의 실제 작업과 결과는 날짜별 기록에 남기고, 단계 완료 체크는 근거가 검토된 뒤에만 갱신합니다.

## 제품 및 시스템 흐름

```text
공식 데이터 source
  → 실제 API REQUEST / RAW RESPONSE / ANALYSIS
  → coverage / normalization / validation / JOIN
  → Drug Master
  → NestJS Safety·DUR hard filter
  → 안전 후보군
  → Python ranking / adaptive question
  → 공식 source 기반 설명·비교
  → Vue UI
```

NestJS는 브라우저 REST API, 공식 API, Firestore, safety 처리와 Python 호출을 조율합니다. Python은 검증된 입력을 받아 feature 계산, 후보 순위, 질문 선택, 유사도와 평가를 담당합니다. Python 모델은 후보 적격성이나 의료 안전을 단독으로 결정하지 않습니다. Frontend는 Python을 직접 호출하지 않습니다.

## 전체 원칙과 게이트

- 실제 공식 데이터가 없거나 식별자 JOIN이 불가능하면 해당 기능을 보류하거나 재설계합니다. mock 약품, 임의 safety/DUR 규칙, 임의 추천, 가짜 training sample로 공백을 채우지 않습니다.
- 공식 API는 각 source마다 실제 요청과 원문 응답으로 계약을 확인합니다. 문서에 필드가 나와도 실제 response에서 확인하기 전에는 서비스 schema로 확정하지 않습니다.
- raw 원문, normalized 값, AI/ML 추출값과 사람 검토 결과를 분리하고 source, 수집 시점, 원문 span을 추적합니다.
- 민감한 건강 입력은 필요한 시간만 처리합니다. 로그인 기능은 현재 없고, raw 건강정보를 영구 저장하거나 training data로 쓰지 않습니다. 추후 사용하려면 익명화·동의·보존 정책을 먼저 설계합니다.
- 데이터 이용 조건, license, quota, robots 및 저장/재배포 권리를 확인합니다. Google 검색 HTML scraping이나 허가 없는 제3자 영상 caption 다운로드를 핵심 수집 경로로 만들지 않습니다.
- build, 배포 또는 Firebase Hosting 같은 production 동작은 별도 요청이 있기 전까지 계획 실행 항목에 포함하지 않습니다. 사용자가 `BUILD`를 명시하기 전에는 `npm run build`, `nest build`, production build를 실행하지 않습니다.

## 단계별 로드맵

### Phase 1 — Project Skeleton

- 상태: [x] 완료 (2026-10-02)
- 계획/완료 날짜: 2026-10-02
- 결과: `front/`, `back/node/`, `back/python/`, `back/data-poc/` 골격, 로컬 실행 설정, `.env.example`, README, 기본 App Shell 및 Node/Python health endpoint
- 확인 근거: Frontend/NestJS typecheck, Python compileall/pip check, health/API 시작 확인
- 미포함: 실데이터, Firestore 연결, recommendation/safety logic, model training, production build/deploy

### Phase 2 — e약은요 API Data PoC

- 상태: [ ] 진행 중 (e약은요 전체 응답·raw·정규화·coverage 확보. product permit `ITEM_SEQ`와 4,740/4,740 unique ID exact join 및 `bizrno`-`BIZRNO` 4,757/4,757 값 일치 확인; 이미지 접근성/권리와 `bizrno` 공식 정의·사용 범위 및 duplicate 의미는 미확인)
- 실제 착수일: 2026-10-06 / 완료 목표일: 미정
- 세부 날짜 체크리스트: [`TODO-PHASE2.md`](TODO-PHASE2.md)
- 실제 진행: 제공된 2026-10-06 API 명세와 실제 API 응답 확인 → 4,757행/48페이지 수집 → raw response 보존 → 실제 response 기준 type/validator/normalizer/coverage 구현 → Phase 3 product-permit와 exact identifier/BIZRNO cross-source comparison
- 잔여 계획: 재현 가능한 20-URL sample의 HTTP 접근성 확인 및 이미지 권리 근거 조사 → 제공기관 근거로 `bizrno` 공식 정의/사용범위와 중복 `itemSeq` 관계 조사. 검증된 raw snapshots는 Git으로 공유하고 generated normalized/report는 원문에서 로컬 재생성; 새 날짜 delta를 위해 새 snapshot이 필요할 때만 재수집
- 완료 기준: 요청, raw, 분석이 함께 있고 total/downloaded/unique/duplicate, 효능·용법·경고·상호작용·부작용·이미지 coverage와 update date range를 실제 데이터 근거로 보고
- 게이트: API key와 API field 이름/형식을 추측하지 않습니다. 실제 응답과 이용 조건이 확보되지 않으면 수집·정규화 구현을 확정하지 않습니다.

### Phase 3 — 공식 데이터 source 확장과 JOIN PoC

- 상태: [ ] 제품허가/낱알식별 전체 snapshot, 안전상비약 raw, exact ID JOIN report 확보 완료. HIRA는 사용자가 네 조건을 넣은 요청 및 `totalCount=1` 응답을 제공했으나 프로젝트의 local 요청에서는 아직 재현되지 않음; 약가목록 operation contract/identifier bridge, DUR base URL은 미확인
- 계획 시작일/목표일: 미정
- source 목록/확인 경계: [`PHASE3-SOURCE-INVENTORY-2026-10-06.md`](../back/data-poc/sources/PHASE3-SOURCE-INVENTORY-2026-10-06.md)
- [x] 알려진 4개 source의 raw-only 단건 요청, source-specific query allowlist, JSON 전체 페이지 수집 및 pagination 검증 준비
- [ ] 사용자 제공 승인 화면/공식 Swagger에서 DUR service base URL과 최신 operation 경로 확인
- [x] 의약품 제품 허가정보 API 승인 상태를 live request로 확인, 42,709 rows/86 pages full raw response 및 e약은요 exact ID coverage 확인
- [ ] DUR API 승인, 최신 operation, 실제 요청/응답, coverage 확인
- [x] 안전상비의약품 API 실제 13행 요청/응답과 식별자 필드 부재 확인
- [x] 낱알식별 API 25,437 rows/51 pages full raw response; exact `ITEM_SEQ` match 2,751/4,740 unique e약은요 IDs 확인
- [x] HIRA user-provided filtered request/response pair recorded: all four search filters, XML `resultCode=00` and `totalCount=1`; service key omitted and HTTP status not provided
- [ ] Reproduce that HIRA query through the local project client and preserve the local raw response. Previous local probes returned 0 and the latest attempt failed before HTTP response; retry one filtered request from a working network path. The no-filter result remains diagnostic only and is not evidence of an empty dataset
- [ ] Confirm separate HIRA drug-price-list API request contract and test any `gnlNmCd` source/bridge; current literal check against MFDS `ITEM_INGR_NAME` had zero exact matches and does not establish a mapping
- [x] e약은요/product permit/pill/safe OTC identifier crosswalk, duplicate/missing counts 및 exact JOIN율 report 생성; safe-OTC identifier 부재와 HIRA-to-product identifier bridge 미확정 사유 기록
- 완료 기준: 실제 source response와 identifier 의미가 확인되고, JOIN 결과 및 미연결 이유를 정량화
- 게이트: 제품명 fuzzy matching으로 JOIN 성공률을 부풀리지 않습니다. 문서의 field명과 실제 응답이 다르면 차이를 기록합니다.

### Phase 4 — Drug Master v1

- 상태: [ ] 진행 중 — 42,709개 product-permit ID를 기준으로 exact-join Drug Master v1을 생성·점검; Firestore schema 검토 전 단계
- 계획 시작일/목표일: 2026-10-06 / 완료 목표일 미정
- [x] 실제 snapshot에서 v1에 사용한 fields와 nullable/empty handling을 확인
- [x] `mfds-item-seq:<ITEM_SEQ>` namespaced internal `drug_id` 및 외부 ID mapping 정의
- [x] source-specific attributes, snapshot version/date 및 page/row-level source references 보존
- [x] manifest/page completeness, row counts, unique master IDs, field types와 exact JOIN counts 검증
- [x] 전체 실제 snapshot에서 Drug Master v1 생성 및 summary 검토
- 완료 기준: source별 사실과 파생/검토 값을 구별하며, 필드와 JOIN 경로를 원문까지 추적 가능
- 결과: [`PHASE4-DRUG-MASTER-2026-10-06.md`](../back/data-poc/sources/PHASE4-DRUG-MASTER-2026-10-06.md); Firestore collection/schema, canonical display precedence, HIRA/DUR/safe-OTC join은 아직 확정하지 않음
- 게이트: Firestore collection/schema는 데이터 확인과 Drug Master 논의 이후 확정합니다.

### Phase 5 — 실제 제품 end-to-end 데이터 검증

- 상태: [ ] 진행 중 — 전체 snapshots와 Drug Master로 1,000개 systematic sample coverage/source comparison 생성. snapshot delta는 아직 없음
- 계획 시작일/목표일: 2026-10-06 / 완료 목표일 미정
- [x] 실제 complete snapshots → Drug Master → 1,000개 재현 sample end-to-end 실행
- [x] 중복/누락/identifier uniqueness 및 표본 source-name 차이 분석; exact source values 유지
- [x] 두 Drug Master의 exact ID 및 source 속성 snapshot 비교기 구현; 동일 원천 snapshot의 재생성 비교에서 변경 0건
- [ ] snapshot 간 변경/coverage 차이 리포트
- [x] 이름 표기 차이 2건을 source references와 함께 review 대상으로 기록; whitespace-removal 진단에서는 둘 다 동등
- [x] sample selector와 실행 절차/산출물 경로 기록
- 완료 기준: 대표 제품 집합에 대해 수집부터 Drug Master까지 재현 가능하고 coverage/JOIN 품질을 설명
- 결과: [`PHASE5-SAMPLE-VALIDATION-2026-10-06.md`](../back/data-poc/sources/PHASE5-SAMPLE-VALIDATION-2026-10-06.md)
- 제한: 현재 비교는 같은 날짜의 동일 source snapshots로 생성한 두 master 사이에서만 수행. 다른 시점 complete snapshots가 있어야 실제 delta를 확인 가능
- 게이트: 실제 수집 건수가 부족하면 수치를 꾸미지 말고 제한 사유를 기록합니다.

### Phase 6 — Symptom Ontology, Question Bank, Safety Engine

- 상태: [ ] 초기 진행 — 효능 원문 4,747건의 worklist와 35,230개의 lexical-only spans를 provenance와 함께 생성. 사람의 개념 분류와 임상 검토는 수행하지 않음
- 계획 시작일/목표일: 미정
- [x] Drug Master의 실제 e약은요 효능 원문을 변경하지 않고 제품 ID 및 원문 snapshot/page/row 참조를 보존한 검토 대기 worklist 생성
- [x] 사람이 검토할 수 있도록 lexical delimiter 기반 span, exact UTF-16 offsets, stable ID, source refs 생성; 모든 span은 pending이며 의미 판단은 하지 않음
- [ ] 사람이 실제 symptom/condition 후보 span을 선택·분류하고 원문, source, 검토 근거에 연결
- [ ] 검토된 symptom ontology와 사용자 표현 mapping 기준 작성
- [ ] Question Bank에 question id/concept/text/answer type/possible answers/safety required/source/review status 기록
- [ ] 필수 safety 질문(연령, 임신, 복용약, 알레르기, 위험 증상 등)을 승인된 근거와 함께 검토
- [ ] NestJS에서 공식 주의사항, 상호작용, DUR, 연령·임부 조건 등 hard filter 설계
- [ ] 질문 종료 조건은 simulation을 통해 정할 수 있도록 지표와 실험안을 준비
- 완료 기준: 안전 관련 질문과 규칙은 source trace 및 필요한 human review를 갖추고 ranking 전에 적용
- 결과/제한: [`PHASE6-EFFICACY-EVIDENCE-2026-10-06.md`](../back/data-poc/sources/PHASE6-EFFICACY-EVIDENCE-2026-10-06.md); 4,747개 원문 evidence와 35,230개 lexical spans가 모두 검토 대기이며 symptom/safety 의미는 부여하지 않음
- 게이트: NLP/AI 후보 추출만으로 새 의료 질문이나 안전 규칙을 즉시 운영하지 않습니다.

### Phase 7 — Python Deterministic Baseline / Similarity / Adaptive Questions

- 상태: [ ] 미착수
- 계획 시작일/목표일: 미정
- [ ] NestJS가 공식 효능·OTC 자격과 safety/DUR 필터를 적용한 candidate set만 Python에 전달
- [ ] 검증된 symptom/context/efficacy 관계에 대한 deterministic ranking baseline 구현
- [ ] ranking 응답의 score, uncertainty/confidence, 설명 feature와 model version 계약 검토
- [ ] ingredient·strength·form·efficacy·usage·warning·DUR에 근거한 drug similarity baseline 설계
- [ ] mandatory safety question 이후 reviewed Question Bank에서 information gain/candidate reduction 기반 질문 선택
- [ ] Python 장애 시 safety filter를 유지하며 deterministic fallback 또는 후보 비교로 처리
- 완료 기준: 실제 verified candidate/data로 end-to-end 요청 경로와 응답 validation을 확인
- 게이트: 데이터와 안전 후보군이 준비되지 않으면 순위·질문을 사용자에게 보여주지 않습니다.

### Phase 8 — Offline Simulation과 Baseline 평가

- 상태: [ ] 미착수
- 계획 시작일/목표일: 미정
- [ ] 검토된 context와 candidate set으로 질문/추천 흐름 반복 simulation
- [ ] 평균 질문 수, 후보 감소, 기준 후보 유지, 필수 safety 질문 완료율, uncertainty 평가
- [ ] 추가 질문의 정보가치와 종료 조건 threshold 비교
- [ ] 결과와 한계를 versioned report로 기록
- 완료 기준: 사람에게 공개하기 전 질문 흐름과 deterministic ranking의 실패·보류 상황을 설명
- 게이트: 사용자 개인 건강정보를 허가 없이 simulation/training 자료로 쓰지 않습니다.

### Phase 9 — Training Data와 Classical ML

- 상태: [ ] 미착수
- 계획 시작일/목표일: 미정
- [ ] 학습 대상 관계를 `drug × symptom × context`로 정의
- [ ] 공식 indication match, 전문가 검토, human-verified ranking 등 허용 가능한 label 정의
- [ ] click/view/favorite는 의료 정답과 분리하고 UX signal로만 검토
- [ ] Logistic Regression, Random Forest, Gradient Boosting 또는 ranking model 비교
- [ ] precision/recall 및 ranking 품질, uncertainty/calibration, subgroup 및 안전 후보 retention 평가
- [ ] training run id, dataset/feature/model version, parameters, seed, metrics, created_at 저장
- [ ] 낮은 신뢰도, 후보 근소차, mapping 불확실 등 human review queue 기준 검토
- 완료 기준: baseline 대비 재현 가능한 평가상 개선과 calibration/evidence review가 있을 때만 모델 채택
- 게이트: label 수와 품질이 충분하지 않으면 deterministic baseline을 유지합니다.

### Phase 10 — Deep Learning 검토 (조건부)

- 상태: [ ] 미착수 / 데이터 요건 충족 후 검토
- 계획 시작일/목표일: 미정
- [ ] 데이터 규모와 label 품질이 deep learning 실험을 정당화하는지 판단
- [ ] 기존 classical model 및 baseline과 같은 split/metric으로 비교
- [ ] PyTorch/embedding 또는 context-drug interaction 접근을 제한된 실험으로 평가
- 완료 기준: 기존 방식 대비 검증 지표와 실무적 이득이 확인될 때만 도입
- 게이트: 딥러닝 자체를 목표로 삼지 않으며 근거가 없으면 도입하지 않습니다.

## 병행 가능한 공통 workstream

### Content Evidence와 외부 콘텐츠

- 상태: [ ] 미착수
- [ ] 관계 단위를 `drug × ingredient × symptom × context`로 설계하고 source URL, author type, credential status, stance, explicitness, confidence, published date, human verification을 추적
- [ ] 검색 API는 source discovery 용도로만 검토하고 content 수집 전 license/terms/robots/storage permission 확인
- [ ] YouTube Data API metadata는 discovery 용도로 검토; 제3자 caption은 허가 없이 핵심 pipeline에서 다운로드하지 않음
- [ ] 같은 creator/source 중복을 제거해 독립 근거 수를 과대 계산하지 않음
- 완료 기준: 모든 사용자 노출 설명이 허용된 source와 원문 근거로 추적 가능

### Firestore와 Node/Python contract

- 상태: [ ] 미착수
- [ ] Drug Master와 source 검증 뒤 실제 Firestore collection/schema 설계
- [ ] Firestore는 서버 측 Firebase Admin SDK만 사용; Firebase Auth, Functions, Hosting, 로그인, Frontend 직접 Firestore 접근은 현재 범위에서 제외
- [ ] NestJS↔Python DTO와 runtime response validation을 확정; Python의 HTTP 오류/timeout/fallback 시 안전 처리 보장
- [ ] 모델 metadata는 Firestore에서 관리하고 대형 model binary는 Firestore 문서에 직접 저장하지 않음
- 완료 기준: 데이터 계약과 service 책임이 실제 source와 실패 경로로 검증됨

### Frontend와 개인정보 경계

- 상태: [ ] 미착수 (앱 셸/경로만 Phase 1에 존재)
- [ ] 데이터와 Safety Engine 완료 전에는 의약품 목록/추천 결과를 mock으로 꾸미지 않음
- [ ] `/recommend` 흐름: 초기 증상 → 필수 safety 질문 → adaptive 질문 → candidate 갱신/종료 → 비교·추천 이유·source
- [ ] Frontend는 다음 질문을 결정하지 않으며 NestJS를 통해서만 Python에 연결
- [ ] 세션은 필요한 최소 범위로 처리하고 증상·복용약·임신·알레르기를 자동 영구 저장하지 않음
- [ ] 검증 이후 `/medicine`, `/medicine/:id`, `/cabinet`, `/pharmacy`, `/board`를 실제 source/요구사항에 맞춰 단계적으로 연결
- 완료 기준: 모바일 우선 화면에서 공식 source를 연결한 설명과 비어 있음/오류/보류 상태를 정확히 표현

## 날짜 및 체크 이력 관리

- 계획 시작일/목표일: 일정 합의 전에는 `미정`
- 작업일마다 [`daily/_TEMPLATE.md`](daily/_TEMPLATE.md)에서 날짜 파일을 만들고 실제 완료와 근거를 기록합니다.
- 날짜 로그는 실제 수행 이력이고 이 파일은 장기 계획입니다. 날짜 로그의 체크만으로 단계 전체 완료를 의미하지 않습니다.
- 완료 체크는 acceptance criteria와 증거를 확인한 날에 갱신하고 Git history에 남깁니다. 이전 날짜 로그는 덮어쓰지 않습니다.
- API 승인이나 데이터 이용 제한 등 외부 요인으로 중단되면 차단 사유와 재개 조건을 날짜 로그에 적고 mock data로 우회하지 않습니다.
- Git commit/push는 사용자의 명시적 절차에 따라 수행합니다. 인수인계 작성자는 자동 commit/push하지 않습니다.
