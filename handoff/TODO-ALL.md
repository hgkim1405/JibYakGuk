# 집약국 전체 남은 작업

- 기준일: 2026-10-06 (Asia/Seoul)
- 범위: Phase 1 완료 이후 현재 계획된 전체 개발 작업
- 이 문서: 미완료 작업을 단계별로 모아 보는 실행 체크리스트
- 상세 계획: [`ROADMAP.md`](ROADMAP.md) / Phase 2의 실제 API 조사: [`TODO-PHASE2.md`](TODO-PHASE2.md)
- 완료 근거와 날짜별 변경: [`daily/`](daily/README.md)

체크하지 않은 항목은 아직 완료 근거가 없습니다. 작업을 끝내면 관련 일자 기록에 결과와 검증 내용을 남긴 뒤 이 목록과 `ROADMAP.md`를 함께 갱신합니다. 시작일과 목표일은 합의되지 않아 미정으로 둡니다.

## 현재 위치

- Phase 1 — **완료** (2026-10-02)
- Phase 2 — **진행 중**. 4,757행 raw/정규화/coverage와 재현 이미지 URL 검사기를 확보. 이미지 표본은 현재 DNS `ENOTFOUND` 20/20이라 HTTP 접근성은 미측정. product permit exact ID join 후 `bizrno` 값은 4,757/4,757 일치했지만 공식 정의·사용 범위, 이미지 권리와 중복 의도는 미확인
- Phase 3 — **진행 중**. 제품허가·낱알식별 전체 snapshot, 안전상비약 13건, exact `itemSeq` 교차표를 확보. HIRA는 사용자 제공 XML과 로컬 zero-row 응답이 불일치하고, DUR base URL/실제 응답은 미확인; 조사 및 결과는 [`Phase 3 API source inventory`](../back/data-poc/sources/PHASE3-SOURCE-INVENTORY-2026-10-06.md)와 [`Phase 3 API observations`](../back/data-poc/sources/PHASE3-OBSERVATIONS-2026-10-06.md)
- Phase 4 — **진행 중**. product-permit 기준 42,709개 `drugId`를 만들고, e약은요·낱알식별 exact JOIN과 원문 행 provenance를 가진 로컬 Drug Master v1 생성. 결과/필드 제한은 [`Phase 4 관찰 기록`](../back/data-poc/sources/PHASE4-DRUG-MASTER-2026-10-06.md)
- Phase 5 — **진행 중**. 1,000개 표본 검토와 Master snapshot 비교기 구현 완료; 같은 네 원천 snapshot의 재생성 비교는 동일. 다른 시점 snapshot delta는 미완료. [`Phase 5 관찰 기록`](../back/data-poc/sources/PHASE5-SAMPLE-VALIDATION-2026-10-06.md)
- Phase 6 — **초기 진행**. e약은요 효능 원문 worklist 4,747건과 lexical-only source span 35,230개를 provenance와 함께 생성, 전부 `pending`. 사람의 증상 분류·질문·안전 규칙은 미착수. [`Phase 6 원문/span 기록`](../back/data-poc/sources/PHASE6-EFFICACY-EVIDENCE-2026-10-06.md)
- Phase 7–9 — **미착수**; Phase 10은 데이터 요건 충족 여부에 따른 조건부 검토
- 병행 workstream — **미착수** (Content Evidence, Firestore/API 계약, 실제 서비스 UI/개인정보 경계)

집 PC에서는 코드·문서와 현재 raw API snapshots를 Git으로 동기화합니다. 기존 수집 결과를 다시 호출하지 않고 snapshot에서 normalized/report를 로컬 생성합니다. 새 시점의 데이터가 실제로 필요할 때만 API를 재호출합니다. 키와 generated normalized/report 파일은 Git에 포함하지 않습니다. 출처/이용 조건은 [`back/data/raw/README.md`](../back/data/raw/README.md)에 기록합니다.

## 궁극 목표에서 추적해야 할 제품 조건

아래 조건은 기술 단계에 흩어져 있더라도 최종 검토에서 빠뜨리지 않습니다. 상세 실행은 해당 Phase/workstream 체크 항목과 함께 관리합니다.

- [ ] 약 이름 대신 사용자의 증상으로 시작해, 증상 정규화 → 안전 질문 → 공식 효능 → 안전 필터 → 탐색 후보로 이어지는 흐름을 실제 데이터로 구현
- [ ] 전체 약에 고정 점수를 주지 않고 `drug × symptom × context` 관계 및 사용자의 현재 답변·약물 feature를 기준으로 후보 우선순위 계산
- [ ] 필수 안전 질문은 정보 이득/모델 점수보다 항상 먼저 적용
- [ ] 모델이 필터링되지 않은 전체 약에서 자격·안전을 임의 결정하지 못하도록 Safety/DUR hard filter 뒤에만 ranking 실행
- [ ] 후보마다 증상/효능 연결, 성분, 사용자 조건의 영향, 주의사항, 순위 이유, 공식 출처를 설명
- [ ] 후보 간 성분·효능·주의사항·사용법 차이를 비교 가능한 근거와 함께 설명
- [ ] 초기에는 공식 데이터와 결정론적 규칙으로 시작하고, 더 복잡한 학습 방식은 검증 성능 향상 근거가 있을 때만 추가
- [ ] 사람 검토 결과를 출처·검토자 유형·근거·버전과 연결해 재현 가능한 학습 label로 관리. 개인 건강정보를 동의 없이 label로 쓰지 않음
- [ ] 사용자에게 “구매하라”고 지시하지 않고, 근거와 한계를 보여주는 일반의약품 탐색 후보로 표현

## Phase 2 — e약은요 데이터 PoC 마무리

- [ ] 집 PC 또는 DNS가 정상 동작하는 환경에서 `nedrug.mfds.go.kr` 이미지 URL 표본의 HTTP 접근성 재확인. 네트워크 오류와 실제 HTTP 오류를 구분
- [x] `brokenImageUrl` 표본 산출 방법 확정: 현재 snapshot의 non-empty distinct URL 2,767개를 모집단으로 하고, lexical sort 후 균등 간격으로 20개를 고르는 재현 표본으로 기록. 표본 결과만 보고 전체 URL 비율로 일반화하지 않음. 기존 ad hoc 20건은 선정 방식이 남지 않아 측정 통계에서 제외
- [ ] 이미지 파일을 저장·재사용·재배포할 경우의 저작권/이용 조건을 확인. API의 “제한 없음” 표기만으로 제3자 이미지 권리까지 단정하지 않음
- [ ] 제공기관 문서 또는 답변으로 응답에 포함된 `bizrno`의 공식 의미와 사용 범위 확인. 확인 전에는 normalized 구조에서 제외 유지
- [ ] 제공기관 문서 또는 답변으로 14개 `itemSeq` 중복 group의 의미 확인. 현재 원본은 중복 제거하지 않고 보존
- [x] `bizrno`, duplicate `itemSeq`/`itemImage`, 이미지 권리·이용범위에 대한 제공기관 확인 질문 초안 작성. 전송/회신은 되지 않았으므로 사실 여부 확인은 미완료
- [x] API-level error body 보존 경로는 가짜 응답 harness에서 HTTP 200 / `resultCode=30`으로 확인했고, Phase 3 product/pill 요청의 실제 `resultCode=11` 오류 body도 raw 저장됨. e약은요 자체 인증 오류 응답은 성공한 호출 경로에서 재검증 필요
- [x] 현재 확인 결과를 Phase 2 TODO, 관찰 기록, 일자별 로그에 반영하고 판단: live 이미지 접근성/권리, `bizrno`, 중복 group 설명이 남아 Phase 2는 계속 진행 중으로 유지

## Phase 3 — 공식 source 확장 및 식별자 JOIN PoC

사전 조사: [`PHASE3-SOURCE-INVENTORY-2026-10-06.md`](../back/data-poc/sources/PHASE3-SOURCE-INVENTORY-2026-10-06.md). 이는 실제 API 수집이나 JOIN 완료를 뜻하지 않습니다.

- [x] 응답 schema를 가정하지 않는 raw-only collector 및 JSON 전체 페이지 수집/응답 pagination validator를 endpoint가 확인된 4개 source에 준비. 요청 status/body와 key 없는 metadata를 보존; DUR은 base URL 확인 전까지 제외
- [x] 사용자 제공 승인 자료와 공식 문서에서 확인 가능한 operation 경로·request parameter·인증 파라미터 대소문자·format을 source inventory에 옮기고, 실제 응답 schema/불확실성을 구분
- [ ] 사용자 제공 승인 화면/공식 Swagger에서 DUR service base URL과 최신 operation 경로 확인
- [x] 의약품 제품 허가정보 API: 실제 요청·raw snapshot, `totalCount=42,709`, 86/86 page, 관찰 schema·exact `itemSeq` JOIN coverage 확보
- [ ] DUR API: 현재 사용 조건/승인/quota 확인, 실제 요청·raw response·응답 구조·coverage 확보
- [x] 안전상비의약품 API: 실제 요청·13행 raw response 확보; 문서와 실제 필드 대조. `itemSeq`가 없어 exact identifier bridge 없음으로 기록
- [x] 낱알식별 API: 전체 raw response/schema/coverage 확보; `ITEM_SEQ` exact ID 기준 e약은요 2,751/4,740 unique matches 확인
- [ ] HIRA 의약품성분약효정보 API: 사용자 제공 XML은 별도 보존. 로컬 요청은 문서 샘플 필터 포함 모두 0 rows라 실제 non-empty response와 일반명 코드 관계는 미확정. HIRA 약가 API에서 코드 source/operation 조사 필요
- [x] HIRA XML parser로 실제 저장된 local zero-row 응답 5개와 출처가 표시된 user-provided one-row XML을 파싱; item tag names와 provenance를 그대로 보존. 이는 live non-empty HIRA response 검증을 대체하지 않음
- [ ] DUR API는 사용자 제공 승인 화면/공식 Swagger에서 service base URL, 현재 사용 조건·승인, operation을 확인하고 raw response/coverage 수집
- [x] product-permit, safe-OTC, pill-identification의 실제 response fields/pagination/operation 동작을 raw response와 대조. HIRA field-name variants는 guide·user sample에 각각 있으나 local live 응답에서 검증되지 않음
- [x] e약은요/product permit/pill identification/safe OTC exact identifier 교차표 작성; HIRA empty live results, safe OTC에 identifier 없음으로 미연결 사유 기록
- [x] 위 source의 ID 누락·중복·field variation을 aggregate report로 집계. product permit ID duplicate 0, pill ID duplicate 10 groups/17 extra rows; product-name fuzzy matching 미사용
- [x] `pillIdentificationMatched`를 exact `itemSeq === ITEM_SEQ` 결과로 측정: 2,751/4,740 unique IDs (58.0%), row denominator도 기록
- [ ] Phase 3 완료 조건: 실제 응답과 identifier 의미를 확인하고 JOIN 결과 및 미연결 사유를 설명 가능

## Phase 4 — Drug Master v1

- [x] 실제 snapshot에서 검증된 v1 사용 필드의 type 및 nullable/empty 규칙 확정; 의미를 확정하지 못한 값은 원문 field name으로 유지
- [x] `drug_id` 형식 `mfds-item-seq:<ITEM_SEQ>`와 외부 ID `mfdsItemSeq` 관계 정의; cross-source는 exact string equality만 사용
- [x] raw values, source별 normalized attributes, AI/ML·사람 검토 결과를 구분; 원문 값은 raw files에 유지
- [x] source, 원문 snapshot/page/1-based row, source capture 시각 provenance를 v1에 보존
- [x] complete page/manifest, required/nullable type, unique product-permit identifier 검증과 unmatched/duplicate aggregate 생성
- [x] 실제 전체 source snapshot으로 42,709개 Drug Master 산출물을 만들고 모든 source reference 72,916개를 원문과 대조
- [ ] Phase 3 JOIN 및 실제 source 결과를 반영해 Firestore 설계 선행 조건 충족 여부 확인
- [ ] Phase 4 완료 조건: 주요 필드와 JOIN을 원문 source까지 추적 가능

## Phase 5 — 실제 제품 end-to-end 데이터 검증

- [x] 실제 complete source snapshots → Drug Master → deterministic 1,000개 exact-ID sample을 정규화/검증
- [x] 전체 source의 duplicate/missing/null/identifier collision과 sample source-name literal discrepancy 분석. whitespace diagnostics는 source 값을 변경하거나 JOIN에 쓰지 않음
- [ ] 서로 다른 snapshot의 변경 및 coverage 차이 비교
- [x] 두 Drug Master의 제품/source 속성 multiset 및 coverage를 비교하는 실행기 구현. 같은 원천 snapshot의 재생성 비교에서 변경 0건; 날짜가 다른 snapshot 비교는 미수행. [관찰 기록](../back/data-poc/sources/PHASE5-SAMPLE-VALIDATION-2026-10-06.md)
- [x] 검토용 source-name 차이 2건을 raw row refs와 함께 report에 추적; 둘 다 whitespace 제거 진단에서는 동등, 원문은 유지
- [x] 재현 가능한 1,000개 systematic sample 선택 규칙, snapshot, sample IDs/hash 및 실행 명령 기록
- [ ] Phase 5 완료 조건: 실제 coverage/JOIN 품질과 한계를 설명 가능

## Phase 6 — Symptom Ontology, Question Bank, Safety Engine

- [x] 검토 준비: Drug Master의 e약은요 효능 원문을 source text 그대로, 제품 ID와 `snapshot/rawFile/rowInPage`에 연결한 검토 대기 worklist로 생성. 자동 분할·증상 분류·안전 해석은 없음. [실행 근거](../back/data-poc/sources/PHASE6-EFFICACY-EVIDENCE-2026-10-06.md)
- [x] lexical delimiter로 검토용 원문 span을 생성하고 exact UTF-16 offsets, stable span ID, source refs 보존; 35,230 spans 전부 `pending`. 이 단계에서는 symptom/condition 후보를 자동 분류하지 않음
- [ ] 사람이 검토해 실제 symptom/condition 후보 span을 선택하고, 원문/source와 검토 근거를 연결
- [ ] 효능 원문 parsing과 symptom classification/normalization 결과를 원문 및 사람 검토 상태와 분리
- [ ] 사람 검토를 거친 symptom ontology와 사용자 표현 mapping 기준 작성
- [ ] Question Bank에 question id, concept, text, answer type, possible answers, safety required, source, review status 기록
- [ ] 연령, 임신, 복용약, 알레르기, 위험 증상 등 필수 safety 질문을 승인된 근거와 함께 검토
- [ ] NestJS에서 공식 주의사항, 상호작용, DUR, 연령·임부 조건 기반 hard filter 설계
- [ ] 질문 종료 조건을 simulation으로 평가할 지표와 실험안 준비
- [ ] 모든 안전 규칙에 source provenance 및 필요한 사람 검토 연결
- [ ] NLP/AI 추출만으로 의료 질문·안전 규칙을 운영하지 않는 게이트 확인
- [ ] Phase 6 완료 조건: 안전 질문과 규칙이 순위 계산보다 먼저 적용되고 근거 추적 가능

## Phase 7 — Python 결정론적 baseline, 유사도, 적응형 질문

- [ ] NestJS가 공식 효능/OTC 자격 및 Safety/DUR 필터를 적용한 후보군만 Python에 전달
- [ ] 검증된 symptom/context/efficacy 관계로 결정론적 ranking baseline 구현
- [ ] ranking score, uncertainty/confidence, 설명 feature, model version 응답 계약 검토
- [ ] 전역 약품 점수 대신 `drug × symptom × context`별 효능 일치, 안전 통과, 사용자 입력, 검증된 feature와 보조 evidence를 결합
- [ ] 사람이 정의하거나 검토한 ranking weight와 그 출처/버전을 관리하고, 공식 safety 조건이 weight에 의해 완화되지 않도록 보장
- [ ] ingredient/strength/form/efficacy/usage/warning/DUR 근거의 약품 유사도 baseline 설계
- [ ] 필수 safety 질문 이후 검토된 Question Bank에서 정보 이득/후보 감소 기반 질문 선택
- [ ] 질문별 예상 후보 감소와 정보량을 계산해 우선순위를 정하고, 질문을 추가할수록 후보가 실제로 갱신되는 흐름 구현
- [ ] Python 장애 시 safety filter를 유지하는 fallback 또는 후보 비교 동작 마련
- [ ] 실제 검증 후보로 end-to-end 요청 경로와 runtime 응답 validation 확인
- [ ] 추천 응답에 후보별 효능/증상 근거, 입력 context 영향, 주의사항, 순위 이유, 공식 source를 포함
- [ ] 비슷한 약 비교 결과에 공통점과 차이점(성분·효능·제형·사용법·주의사항)을 source와 연결
- [ ] confidence가 낮거나 후보 차이가 작거나 효능 mapping이 모호한 상황의 보류/사람 검토 응답 정의
- [ ] 데이터와 안전 후보군 준비 전에는 순위/질문을 사용자에게 표시하지 않는 게이트 확인

## Phase 8 — 오프라인 simulation과 baseline 평가

- [ ] 검토된 context와 후보군으로 질문/추천 흐름 반복 simulation
- [ ] 평균 질문 수, 후보 감소, 기준 후보 유지, 필수 safety 질문 완료율, uncertainty 평가
- [ ] 추가 질문의 정보 가치와 종료 threshold 비교
- [ ] 결과, 한계, 실행 버전을 versioned report로 기록
- [ ] 질문 시스템의 후보 감소 및 사용자 이해도 개선을 평가할 관찰 가능한 지표 설계
- [ ] 사용자 노출 전 질문 흐름과 deterministic ranking의 실패/보류 상황 설명 가능 여부 확인
- [ ] 개인 건강정보를 허가 없이 simulation/training 자료로 쓰지 않는 정책 확인

## Phase 9 — Training data와 Classical ML

- [ ] 학습 대상 관계를 `drug × symptom × context`로 정의
- [ ] Stage 0 공식 데이터+규칙 → Stage 1 feature ranking → Stage 2 classical ML → Stage 3 learning-to-rank 순서와 각 단계 진입 조건 정의
- [ ] 공식 적응증, 전문가 검토, 사람 검증 ranking 등 허용 가능한 label 기준 정의
- [ ] click/view/favorite를 의료 정답과 분리해 UX signal로만 취급
- [ ] Logistic Regression, Random Forest, Gradient Boosting 또는 ranking model 비교
- [ ] precision/recall, ranking 품질, uncertainty/calibration, subgroup, 안전 후보 retention 평가
- [ ] training run id, dataset/feature/model version, parameters, seed, metrics, created_at 보존
- [ ] 낮은 신뢰도, 후보 간 점수 차이가 작음, mapping 불확실 등에 대한 human review queue 기준 검토
- [ ] 불확실 사례를 우선 검토 대상으로 고르고, 검토 결과의 재사용/학습 여부·품질 기준·dataset version을 추적하는 active learning 절차 설계
- [ ] deterministic baseline 대비 재현 가능한 개선과 calibration/evidence review가 있을 때만 모델 채택
- [ ] label 양/품질이 부족하면 deterministic baseline을 유지

## Phase 10 — Deep Learning 검토 (조건부)

- [ ] 데이터 양과 label 품질이 실험을 정당화하는지 평가
- [ ] 조건을 충족하는 경우에만 제한된 PyTorch/embedding 또는 context-drug interaction 실험 수행
- [ ] classical model 및 baseline과 같은 split/metric으로 결과 비교
- [ ] 기존 방식보다 검증 지표와 실무상 이점이 확인된 경우에만 도입

## 병행 workstream — Content Evidence 및 외부 콘텐츠

- [ ] `drug × ingredient × symptom × context` 관계 단위 설계
- [ ] source URL, author type, credential status, stance, explicitness, confidence, published date, human verification 기록 체계 설계
- [ ] sourceWeight, credentialWeight, symptomMatch, contextMatch, freshness, extractionConfidence, sourceIndependence를 별도 feature로 정의하고 근거/버전 기록
- [ ] 검색 API는 source discovery 용도로만 검토
- [ ] content 수집 전에 license, terms, robots, 저장 permission 확인
- [ ] YouTube Data API metadata를 discovery 용도로 검토
- [ ] 별도 허가 없는 제3자 caption 다운로드를 핵심 pipeline에 사용하지 않음
- [ ] 같은 creator/source의 중복을 제거해 독립 근거 수를 과대 계산하지 않음
- [ ] 사용자에게 노출되는 모든 설명을 허용된 source와 원문 근거까지 추적

## 병행 workstream — Firestore와 Node/Python contract

- [ ] Drug Master와 source 검증 뒤 Firestore collection/schema 설계
- [ ] Firestore는 서버 측 Firebase Admin SDK만 사용
- [ ] 현재 범위에서 Firebase Auth, Functions, Hosting, 로그인, Frontend 직접 Firestore 접근을 추가하지 않음
- [ ] NestJS↔Python DTO와 runtime response validation 확정
- [ ] Python HTTP 오류, timeout, fallback 때 안전한 처리 보장
- [ ] model metadata는 Firestore에서 관리하고 대형 model binary를 Firestore 문서에 저장하지 않음
- [ ] 실제 source와 실패 경로로 데이터 계약 및 서비스 책임 검증

## 병행 workstream — Frontend와 개인정보 경계

- [ ] 데이터 및 Safety Engine 완료 전 mock 의약품 목록/추천 결과를 제공하지 않음
- [ ] `/recommend`: 초기 증상 → 필수 safety 질문 → adaptive 질문 → 후보 갱신/종료 → 비교·추천 이유·source 흐름 구현
- [ ] `/medicine/:id`에서 제품 이미지(권리 확인 후), 제품명, 제조사, 성분, 공식 효능, 사용법, 주의사항, 상호작용, 부작용, DUR, 안전상비약 여부, 식별정보, 유사약과 출처를 가능한 coverage에 따라 표시
- [ ] `/cabinet`에 해열/진통, 감기, 소화, 설사, 알레르기, 멀미, 근육/관절, 상처, 기타 목적 분류를 제공하고 성분 → 계열 → 제품 순으로 탐색
- [ ] 공식 데이터가 뒷받침될 때만 편의점 구매 가능 표시. 일반 약국 위치와 특정 제품 재고 여부를 별도 사실로 표시
- [ ] `/pharmacy`에 공식 약국 위치 데이터가 있는지 확인한 뒤 구현. 재고 source가 없으면 특정 약 재고를 표시하지 않음
- [ ] `/board`의 사용자 작성 질문/답변을 공식 의약정보·전문가 근거와 UI에서 명확히 구별
- [ ] Frontend가 다음 질문을 자체 결정하지 않고 NestJS를 통해 Python과 연결
- [ ] 세션에서 건강 입력을 필요한 최소 범위로 처리하고 증상·복용약·임신·알레르기를 자동 영구 저장하지 않음
- [ ] 검증 이후 `/medicine`, `/medicine/:id`, `/cabinet`, `/pharmacy`, `/board`를 실제 source/요구사항에 맞춰 단계적으로 연결
- [ ] 모바일 우선 화면에서 source 설명과 빈 상태/오류/보류 상태를 정확히 표현
- [ ] 사용자가 “왜 이 후보인가, 내 어떤 조건이 영향을 줬나, 왜 다른 후보보다 먼저 보이나”를 확인할 수 있는 설명/UI 검토
- [ ] 개인정보 처리에는 익명화·동의·보존 정책을 먼저 설계하고 운영 반영

## 일정 및 실행 제약

- 계획 시작일과 목표일은 사용자가 정하기 전까지 미정
- production build, Firebase Hosting 등 배포 작업은 별도 요청 전까지 미실행. `BUILD` 요청 전에는 `npm run build`, `nest build`, production build를 실행하지 않음
- 공식 데이터, JOIN, 안전 검토가 준비되지 않으면 mock 약품·임의 safety/DUR·가짜 학습 데이터를 넣지 않음
- commit/push는 사용자가 명시적으로 요청한 절차로만 진행
