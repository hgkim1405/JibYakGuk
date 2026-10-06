# Phase 5 — 1,000개 실제 제품 표본 검증

- 작업일: 2026-10-06 (Asia/Seoul)
- 구현: [`phase5/sample-validation.ts`](phase5/sample-validation.ts)
- 입력 Drug Master: `back/data/normalized/drug-master/drug-master-v1-2026-10-06T07-06-28.503Z.json` (Git 제외)
- summary report: `back/data/reports/phase5/drug-master-sample-2026-10-06T07-08-44.543Z.json` (Git 제외)

## 표본 정의

- 모집단: product-permit `ITEM_SEQ` 기준 42,709개 Drug Master row.
- 표본: 1,000개 제품. 정확한 `mfdsItemSeq` 문자열을 lexical sort한 뒤 양 끝 포함 균등 간격으로 선택했습니다. 보고서는 선택한 identifier와 SHA-256을 보존합니다.
- 이 방법은 deterministic systematic sample이며 random sample이 아닙니다. 관찰 비율을 전체 모집단 품질로 일반화하지 않습니다.
- name comparison은 source raw text의 literal equality를 우선 집계하고, 별도로 whitespace 제거 진단을 제공합니다. normalized source values는 덮어쓰지 않습니다.

## 표본 결과

| 지표 | 결과 |
|---|---:|
| 표본 제품 수 | 1,000 |
| e약은요가 연결된 제품 / 원문 행 | 112 / 112 |
| 낱알식별이 연결된 제품 / 원문 행 | 489 / 489 |
| 표본 안 e약은요 중복행 제품 | 0 |
| 표본 안 낱알식별 중복행 제품 | 0 |
| 제품허가-낱알식별 literal product-name match | 487 / 489 |
| 제품허가-e약은요 product name/company literal match | 112 / 112 pairs |
| 제품허가-낱알식별 company literal match | 489 / 489 pairs |

낱알식별 이름의 literal 차이 2건 모두 whitespace 문자를 제거하는 진단에서는 동등했습니다. 예를 들어 `itemSeq=199100708`에서 제품허가 원문은 성분명 뒤에 CRLF가 있고, 낱알식별 원문에는 그 줄바꿈이 없습니다. `itemSeq=201504301`은 제품허가 이름 끝에 CRLF가 있습니다. 이는 이 표본에서 확인한 문자 차이의 성격일 뿐, API 값을 정규화하거나 다른 source를 우선한다는 규칙은 아닙니다. 두 값과 원문 위치는 기계 리포트에 남겼습니다.

## 한계와 다음 단계

- 이 1,000개 표본에는 source 중복행이 없지만 전체 데이터에는 e약은요 14개, 낱알식별 10개 중복 ID group이 있습니다. 전체 duplicate 처리는 Phase 4 master에서 행 단위로 보존했습니다.
- 표본은 snapshot 간 추가·삭제·수정 변화를 비교하지 않습니다. 다른 시점의 complete API snapshot을 확보해야 이 비교를 실행할 수 있습니다.
- 날짜별 Master 비교기 [`phase5/snapshot-diff.ts`](phase5/snapshot-diff.ts)를 추가했습니다. 두 complete Drug Master를 exact `drugId` 기준으로 비교하고, source별 attribute 값은 row-order-independent multiset으로 대조하며 changed examples에 양쪽 raw references를 넣습니다. 미연결 e약은요·낱알식별은 exact source identifier로, 식별자 없는 safe OTC는 exact attribute-row content로 따로 집계합니다.
- 2026-10-06에 동일한 네 source snapshots로 생성한 두 Master를 비교했을 때 42,709 products가 모두 일치했고, 추가/삭제/변경은 0건이었습니다. e약은요 연결 4,757 rows/4,740 products, 낱알식별 연결 21,858 rows/21,841 products와 미연결 3,579 rows, safe OTC 13행도 양쪽이 동일했습니다. 이 비교는 재생성 일관성 확인이지 서로 다른 시점의 snapshot delta 결과가 아닙니다. 실제 날짜 간 변화 항목은 아직 미완료입니다.
- 표본의 source coverage는 이 selection 결과만 설명하며 임상 효능·안전, 이미지 권리, HIRA/DUR 연결 가능성을 판단하지 않습니다.
- 다른 날짜의 snapshot delta report와 실패/사람 검토 절차를 추가한 뒤 Phase 5를 완료로 표시합니다.
