# Phase 6 — 효능 원문 검토 worklist 준비

- 작업일: 2026-10-06 (Asia/Seoul)
- 생성기: [`phase6/efficacy-evidence-worklist.ts`](phase6/efficacy-evidence-worklist.ts)
- 입력 Drug Master: `back/data/normalized/drug-master/drug-master-v1-2026-10-06T07-06-28.503Z.json` (Git 제외)
- 산출물: `back/data/normalized/phase6-efficacy/efficacy-evidence-2026-10-06T07-14-39.451Z.json` (Git 제외)

## 실제 원문 집계

| 항목 | 수 |
|---|---:|
| Drug Master 제품 | 42,709 |
| e약은요 source rows | 4,757 |
| 비어 있지 않은 `efcyQesitm` evidence | 4,747 |
| `efcyQesitm` null/empty rows | 10 |
| evidence가 있는 고유 product ID | 4,732 |

중복 e약은요 제품 행을 합치거나 제거하지 않았습니다. 각 evidence는 `drugId` 및 `snapshot + rawFile + 1-based rowInPage`를 보존합니다. `sourceText`는 원문 그대로 복사하며 위치와 제품 ID가 같으면 재실행에서도 유지되는 SHA-256 기반 evidence ID를 부여합니다.

## 검토 경계

- 전체 4,747 evidence는 `reviewStatus=pending`, `reviewedConcepts=[]`입니다.
- 이 도구는 문장을 나누거나 증상/질환 개념을 추출하지 않습니다.
- 효능 문구를 안전성, 적합성, 진단 또는 치료 판단으로 해석하지 않습니다.
- sourceItemName은 같은 e약은요 source row의 명칭입니다. 제품허가의 이름으로 덮어쓰지 않습니다.
- 다음 단계는 사람이 원문 span을 보며 표현 분할 및 개념 mapping 기준을 정하고, 사람 검토 상태·검토 근거를 별도 기록하는 것입니다. 그 검토 전에는 추천이나 Safety Engine에서 사용하지 않습니다.

## 실행 및 검증

- 실행: `back/node/`에서 `node -r ts-node/register ../data-poc/sources/phase6/efficacy-evidence-worklist.ts ..\data\normalized\drug-master\drug-master-v1-2026-10-06T07-06-28.503Z.json`
- strict `tsc --noEmit`으로 이 파일의 타입 검사를 수행했고, 실제 Drug Master에서 worklist를 생성했습니다.
- automated tests/full build는 실행하지 않았습니다.
