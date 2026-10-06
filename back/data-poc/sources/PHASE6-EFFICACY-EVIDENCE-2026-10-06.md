# Phase 6 — 효능 원문 검토 worklist 준비

- 작업일: 2026-10-06 (Asia/Seoul)
- 생성기: [`phase6/efficacy-evidence-worklist.ts`](phase6/efficacy-evidence-worklist.ts), [`phase6/efficacy-text-spans.ts`](phase6/efficacy-text-spans.ts)
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
- worklist 생성기는 원문을 나누거나 증상/질환 개념을 추출하지 않습니다.
- 효능 문구를 안전성, 적합성, 진단 또는 치료 판단으로 해석하지 않습니다.
- sourceItemName은 같은 e약은요 source row의 명칭입니다. 제품허가의 이름으로 덮어쓰지 않습니다.
- worklist와 별도인 text-span 생성기가 원문에서 재현 가능한 lexical boundary만 적용합니다. 이 span들은 symptom/condition label이 아닙니다.
- 사람 검토 전에는 원문/segment를 추천이나 Safety Engine에서 사용하지 않습니다.

## 어휘 경계 기반 원문 span

- 입력 worklist: `back/data/normalized/phase6-efficacy/efficacy-evidence-2026-10-06T07-14-39.451Z.json` (Git 제외; 원문 API snapshots에서 재생성 가능)
- 생성기: [`phase6/efficacy-text-spans.ts`](phase6/efficacy-text-spans.ts)
- 산출물: `back/data/normalized/phase6-efficacy/efficacy-text-spans-2026-10-06T07-50-58.968Z.json` (Git 제외)
- 실제 집계: 4,747 evidence rows, 35,230 spans, span 없는 evidence 0
- 관찰한 split delimiter: 쉼표 27,589, 마침표 4,882, LF 3,349, `ㆍ` 1,593, `·` 1,147, `•` 11
- 각 span은 exact source text slice, half-open UTF-16 offsets, stable SHA-256 span ID, source row ref, 약품 ID를 유지합니다. `gapAfter`는 span 사이의 공백·구분자를 보존합니다.
- 모든 span은 `pending`, `reviewedConcepts=[]`입니다. 도구는 증상/질환 분류, 진단, 안전성 또는 치료 해석을 하지 않습니다.
- 분할은 쉼표/세미콜론/줄바꿈/중간점·bullet을 경계로 쓰며, 문장 부호는 뒤에 공백 또는 원문 끝이 올 때만 나눕니다. 이 규칙은 검토용 text span일 뿐 임상적 구문 분석 규칙은 아닙니다.

## 실행 및 검증

- 실행: `back/node/`에서 `node -r ts-node/register ../data-poc/sources/phase6/efficacy-evidence-worklist.ts ..\data\normalized\drug-master\drug-master-v1-2026-10-06T07-06-28.503Z.json`
- strict `tsc --noEmit`으로 이 파일의 타입 검사를 수행했고, 실제 Drug Master에서 worklist를 생성했습니다.
- span 도구 strict `tsc --noEmit` 통과. 실제 4,747-row worklist에서 산출물을 생성한 뒤 별도 readback으로 evidence/ref/text 보존, 각 offset substring, gap, span hash, pending state를 전체 대조해 0 mismatch를 확인했습니다.
- automated tests/full build는 실행하지 않았습니다.
