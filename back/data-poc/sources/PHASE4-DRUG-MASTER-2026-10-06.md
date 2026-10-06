# Phase 4 — Drug Master v1 관찰 기록

- 작업일: 2026-10-06 (Asia/Seoul)
- 입력: 2026-10-06에 수집한 e약은요, MFDS 제품허가, 낱알식별, 안전상비의약품 complete raw snapshots
- 생성기: [`phase4/drug-master.ts`](phase4/drug-master.ts)
- 기계 summary: `back/data/reports/drug-master/drug-master-v1-2026-10-06T07-06-28.503Z-report.json` (Git 제외)
- 실제 Drug Master: `back/data/normalized/drug-master/drug-master-v1-2026-10-06T07-06-28.503Z.json` (Git 제외, 77,865,906 bytes)

## v1 identity와 필드 경계

- 기준 entity는 제품허가 응답의 고유 `ITEM_SEQ`입니다. 내부 키는 `mfds-item-seq:<ITEM_SEQ>`이며 외부 식별자는 `mfdsItemSeq`로 따로 보존합니다.
- e약은요 `itemSeq`와 낱알식별 `ITEM_SEQ`는 원문 문자열의 exact equality만으로 연결합니다. 이름 유사도, `BIZRNO` 또는 제조사명으로 연결하지 않습니다.
- `productPermit`, `easyDrug`, `pillIdentification` 속성을 각각 source 아래 둡니다. product/e약은요에서 이름이나 업체명이 다를 때 우선값을 임의로 정하지 않습니다.
- 실제 source row를 `snapshot + rawFile + 1-based rowInPage`로 연결합니다. 모든 source snapshot의 manifest, 연속 페이지, response metadata, API 성공 envelope, 행 수 및 `totalCount`를 생성 전에 다시 확인합니다.
- 선택한 text 필드는 원문 문자열을 보존합니다. optional field의 JSON `null`, 빈 문자열, 공백 문자열은 normalized 출력에서 `null`입니다. 필드 누락과 문자열 외 타입은 오류로 중단합니다. 복합 성분 원문은 문자열로 두고 ingredient token이나 용량 단위로 나누지 않습니다.
- image URL fields는 외부 이미지 권리를 확인하지 못해 산출물에서 제외했고, e약은요의 미문서 `bizrno`와 각 source의 `BIZRNO`는 공식 의미·사용 범위가 해결될 때까지 제외했습니다. 원문 값은 raw snapshot에 보존합니다.
- Firestore schema, canonical display name, DUR/HIRA 안전 규칙, 추천 로직은 이 산출물에서 정의하지 않습니다.

## 실제 snapshot 결과

| Source | Raw rows | 고유 `ITEM_SEQ` / `itemSeq` | product-permit Drug Master exact match |
|---|---:|---:|---:|
| Product permit (master spine) | 42,709 | 42,709 | 42,709 |
| e약은요 | 4,757 | 4,740 | 4,740 IDs / 4,757 rows |
| Pill identification | 25,437 | 25,420 | 21,841 IDs / 21,858 rows |
| Safe OTC | 13 | identifier 없음 | 연결하지 않고 13 rows 별도 보존 |

- 생성된 Drug Master: 42,709 records. 제품허가 `ITEM_SEQ` 충돌은 0건입니다.
- 모든 e약은요 고유 ID 및 4,757 raw rows가 제품허가와 일치했습니다. e약은요 내 14개 duplicate groups는 source row 배열로 유지했습니다.
- 낱알식별 21,841개 고유 ID가 제품허가와 exact match했습니다. 10개 duplicate groups는 각 물리 식별 속성값과 원문 참조를 행 단위로 유지했습니다. 연결되지 않은 3,579 rows는 `unlinkedSources.pillIdentification`에 별도 기록했습니다.
- 안전상비의약품 응답에는 공통 exact product ID가 없으므로 이름이나 업체명으로 연결하지 않고 `unlinkedSources.safeOtc`에 제품명·업체명·유효기간·저장방법과 원문 참조를 기록했습니다.
- 산출물 전체의 raw references 72,916개를 입력 raw page의 원래 ID와 대조했습니다. `image` 또는 `bizrno` 키는 normalized output에 없습니다.

## 검증

- `tsc --noEmit --strict --target es2022 --module commonjs --moduleResolution node --skipLibCheck --types node ..\data-poc\sources\phase4\drug-master.ts` (working directory `back/node`): 통과.
- 생성기를 네 complete snapshot에 실행해 master 및 summary report를 생성했습니다.
- 별도 readback 검사에서 42,709 unique master IDs, 4,757 e약은요 rows, 25,437 낱알식별 rows, 13개 미연결 안전상비약 rows, 원문 참조 72,916개를 확인했습니다. 참조된 각 row의 identifier가 master/unlinked record ID와 동일했습니다.
- 출력 경로는 `.gitignore`에 의해 제외됩니다. automated tests, full application typecheck/build는 실행하지 않았습니다.

## 다음 실행 작업

1. 현 master field projection과 명칭 우선순위를 domain 요구와 맞춰 검토하되, source별 값 차이는 그대로 둡니다.
2. 서로 다른 날짜의 complete snapshot을 만들고 추가·삭제·변경, coverage, collision 변화 보고서를 추가합니다.
3. DUR source contract/응답과 HIRA non-empty XML을 확보한 뒤 별도 source projection으로 추가합니다. 현재 HIRA local zero-row와 사용자 제공 one-row sample의 차이는 미해결입니다.
4. Safe OTC의 item identifier bridge가 공식적으로 확인되기 전까지 미연결로 유지합니다.
5. Phase 4 source/identifier/field 검토 뒤에만 Firestore 설계를 논의합니다.
