# Data PoC

공식 데이터의 요청·원문 보존·응답 검증·coverage를 수행하는 작업 공간입니다. 문서의 필드 목록만으로 response schema를 확정하지 않고 실제 API 원문을 기준으로 분석합니다.

Phase 3 API별 확인된 공식 source 메타데이터와 미확인 사항은 [source inventory](sources/PHASE3-SOURCE-INVENTORY-2026-10-06.md)에 기록합니다. 실제 응답이나 JOIN을 확보했다는 뜻은 아닙니다.

## Phase 3 raw-only 요청 준비

[`sources/phase3/phase3.raw.collector.ts`](sources/phase3/phase3.raw.collector.ts)는 검증된 URL이 있는 4개 source에 대해 첫 페이지 한 번을 요청하고, HTTP status와 무변형 response body를 key 없는 metadata와 함께 저장합니다. 응답 schema를 파싱하거나 pagination을 자동 실행하지 않습니다. DUR은 공식 base URL을 확인하지 못해 허용 목록에 포함하지 않았습니다.

실제 단건 응답을 확인한 뒤 JSON source용 전체 페이지 수집도 추가했습니다. 수집기는 `header/body/items` pagination 응답과 페이지별 `totalCount`를 확인하고, API 오류나 예상 밖 응답은 받은 raw page를 남긴 뒤 중단합니다. product-permit과 pill-identification에서 `numOfRows=1000`은 API `resultCode=11`과 최대 500이라는 오류를 반환했고, 500행 요청은 실제 성공했습니다.

`back/node/`에서 로컬 ignored `.env`의 key를 설정한 뒤 한 번에 한 source만 요청합니다.

```powershell
node --env-file=.env -r ts-node/register ../data-poc/sources/phase3/phase3.raw.collector.ts product-permit 10 1
node --env-file=.env -r ts-node/register ../data-poc/sources/phase3/phase3.raw.collector.ts safe-otc 10 1
node --env-file=.env -r ts-node/register ../data-poc/sources/phase3/phase3.raw.collector.ts pill-identification 10 1
node --env-file=.env -r ts-node/register ../data-poc/sources/phase3/phase3.raw.collector.ts hira-ingredient-effect 10 1
```

단건 명령 인자는 `<source> <numOfRows> <pageNo> [name=value ...]` 순입니다. source별로 승인된 필터만 받습니다. HIRA 필터는 HWP 가이드에 있는 `gnlNmCd`, `gnlNm`, `meftDivNo`, `divNm`입니다. metadata에는 필터 값 대신 parameter 이름만 기록합니다. 결과는 `back/data/raw/phase3/<source>/probe-<timestamp>/`에 저장됩니다.

JSON source 전체 페이지 수집은 다음 명령을 사용합니다. 날짜별 API quota를 확인하고 요청 간격을 유지하세요.

```powershell
node --env-file=.env -r ts-node/register ../data-poc/sources/phase3/phase3.raw.collector.ts --all product-permit 500 500
node --env-file=.env -r ts-node/register ../data-poc/sources/phase3/phase3.raw.collector.ts --all pill-identification 500 500
node --env-file=.env -r ts-node/register ../data-poc/sources/phase3/phase3.raw.collector.ts --all safe-otc 500 500
```

`--all` 인자는 `<source> <numOfRows> <delayMs> [outputDirectory]` 순입니다. 각 날짜의 `dataset-<timestamp>/snapshot-manifest.json`에서 예상/실제 행과 페이지 수를 확인합니다. HIRA는 XML 전용이라 현재 단건 raw 수집만 지원합니다.

저장된 HIRA XML을 원문 필드명 그대로 파싱하려면 `sources/phase3/hira_xml_parser.py`를 사용합니다. metadata에서 출처·시각·parameter name 등 안전한 항목만 복사하고 XML SHA-256과 raw filename을 보존하며 service-key 필드/값은 출력하지 않습니다. 제공된 guide와 sample에서 제형/투여경로 필드명이 달라 item tag 이름은 alias 처리하지 않습니다.

```powershell
python ..\data-poc\sources\phase3\hira_xml_parser.py `
  ..\data\raw\phase3\hira-ingredient-effect\user-provided-sample-2026-10-06\response.xml `
  --metadata ..\data\raw\phase3\hira-ingredient-effect\user-provided-sample-2026-10-06\metadata.json
```

기본 JSON 출력은 `.gitignore` 대상 `back/data/normalized/hira-ingredient-effect/` 아래에 저장됩니다. 사용자 예시 응답과 live API raw는 서로 다른 provenance를 갖습니다.

Phase 3 snapshot의 exact identifier 교차표와 필드 coverage 보고서는 [`phase3.analysis.ts`](sources/phase3/phase3.analysis.ts)로 생성합니다. 자세한 2026-10-06 결과는 [Phase 3 API 관찰](sources/PHASE3-OBSERVATIONS-2026-10-06.md)에 있습니다.

## Phase 4 Drug Master v1

[`sources/phase4/drug-master.ts`](sources/phase4/drug-master.ts)는 complete manifest와 모든 원문 페이지·metadata를 다시 확인한 뒤 현재 검증된 product-permit snapshot을 기준으로 Drug Master를 만듭니다. `drugId`는 exact `ITEM_SEQ`에 `mfds-item-seq:` namespace를 붙여 결정하고, e약은요와 낱알식별은 exact string equality로만 연결합니다. 같은 identifier의 중복 행은 배열로 보존하며, source별 attribute와 원문 page/row 위치를 따로 기록합니다. canonical name이나 이미지 우선순위를 만들지 않고, HIRA/DUR은 현재 비어 있거나 실제 응답이 없어 포함하지 않습니다.

`back/node/`에서 현재 확보한 snapshots로 재생성하는 명령입니다. 각 입력은 complete snapshot directory여야 합니다.

```powershell
node -r ts-node/register ../data-poc/sources/phase4/drug-master.ts `
  ..\data\raw\easy-drug\snapshot-2026-10-06T05-52-37.917Z `
  ..\data\raw\phase3\product-permit\dataset-2026-10-06T06-46-09.472Z `
  ..\data\raw\phase3\pill-identification\dataset-2026-10-06T06-47-54.971Z `
  ..\data\raw\phase3\safe-otc\dataset-2026-10-06T06-45-57.006Z `
  ..\data\normalized\drug-master\drug-master-handoff-2026-10-06.json
```

마지막 argument는 output 경로를 지정합니다. 결과와 report는 `.gitignore` 대상인 `back/data/normalized/drug-master/`와 `back/data/reports/drug-master/`에 저장됩니다. 이 local output을 Phase 5/6 명령에서 재사용하세요. 이미지 URL과 `BIZRNO`는 권리/공식 field 의미 확인 전까지 정규화 산출물에서 제외하지만 raw snapshot에는 그대로 둡니다. 안전상비약은 product ID bridge가 없어 `unlinkedSources.safeOtc`에 분리합니다. 생성된 산출물은 [Phase 4 관찰 기록](sources/PHASE4-DRUG-MASTER-2026-10-06.md)에 기록합니다.

Drug Master에서 1,000개까지의 deterministic systematic sample을 검토하려면 다음 명령을 사용합니다. 표본은 `mfdsItemSeq` lexical order를 기준으로 균등 간격 선택하며 random sample이 아니므로 population 전체의 비율 추정에 사용하지 않습니다. 이름 비교는 source 원문을 유지한 채 exact equality와 whitespace-removal diagnostic을 따로 보고합니다.

```powershell
node -r ts-node/register ../data-poc/sources/phase5/sample-validation.ts `
  ..\data\normalized\drug-master\drug-master-handoff-2026-10-06.json 1000
```

기본 report 경로는 Git 제외 대상인 `back/data/reports/phase5/`입니다. 2026-10-06 표본 결과는 [Phase 5 관찰 기록](sources/PHASE5-SAMPLE-VALIDATION-2026-10-06.md)에 있습니다.

서로 다른 시점의 Drug Master를 비교하려면 [`sources/phase5/snapshot-diff.ts`](sources/phase5/snapshot-diff.ts)에 두 master JSON 파일을 전달합니다. source row 순서와 provenance 경로 변경은 제외하고 source별 attribute 원문 multiset을 비교합니다. 제품 ID 추가/삭제, 바뀐 source fields 및 raw refs, unlinked e약은요·낱알식별 ID 변화, identifier가 없는 안전상비약의 exact row-content 변화를 보고합니다.

```powershell
node -r ts-node/register ../data-poc/sources/phase5/snapshot-diff.ts `
  ..\data\normalized\drug-master\drug-master-v1-<previous>.json `
  ..\data\normalized\drug-master\drug-master-v1-<current>.json
```

기본 산출물은 Git 제외 대상 `back/data/reports/phase5/`에 생성됩니다. 현재 로컬의 두 master는 동일한 원천 snapshots에서 재생성한 것이므로 해당 비교는 재생성 일관성만 확인하며 날짜 간 변화를 입증하지 않습니다.

## Phase 6 효능 원문 검토 준비

[`sources/phase6/efficacy-evidence-worklist.ts`](sources/phase6/efficacy-evidence-worklist.ts)는 Drug Master v1의 e약은요 `efcyQesitm` 원문을 제품 ID와 source row 참조에 연결한 검토 대기 목록으로 복사합니다. 문장 분할, 증상 분류, safety/treatment 해석은 수행하지 않으며, 모든 항목은 `pending` 상태와 빈 `reviewedConcepts`로 남습니다.

`back/node/`에서 실제 master 파일을 지정해 생성합니다.

```powershell
node -r ts-node/register ../data-poc/sources/phase6/efficacy-evidence-worklist.ts `
  ..\data\normalized\drug-master\drug-master-handoff-2026-10-06.json `
  ..\data\normalized\phase6-efficacy\efficacy-evidence-handoff-2026-10-06.json
```

기본 출력은 Git 제외 대상인 `back/data/normalized/phase6-efficacy/` 아래에 저장됩니다. 2026-10-06 실행 결과와 제한은 [Phase 6 효능 원문 worklist 관찰](sources/PHASE6-EFFICACY-EVIDENCE-2026-10-06.md)에 기록합니다.

`efficacy-text-spans.ts`는 이 worklist의 원문을 lexical separator 기준으로 span으로 나누고 각 text slice의 half-open UTF-16 offsets, stable span ID, 원문 provenance를 보존합니다. 결과는 여전히 사람 검토 대기이며 증상·질환·안전 의미를 부여하지 않습니다. API 재요청 없이 이어서 생성하려면 다음을 실행합니다.

```powershell
node -r ts-node/register ../data-poc/sources/phase6/efficacy-text-spans.ts `
  ..\data\normalized\phase6-efficacy\efficacy-evidence-handoff-2026-10-06.json `
  ..\data\normalized\phase6-efficacy\efficacy-text-spans-handoff-2026-10-06.json
```

세 파일(`drug-master-handoff-2026-10-06.json`, `efficacy-evidence-handoff-2026-10-06.json`, `efficacy-text-spans-handoff-2026-10-06.json`)은 원문 snapshot에서 만드는 ignored local outputs입니다. 매 실행은 기존 파일을 덮어쓰지 않으므로 다른 이름/날짜를 지정하세요.

## e약은요 현재 상태

2026-10-06에 API에서 전체 4,757행을 순차 수집했습니다. 실제 응답 구조와 coverage 수치는 [관찰 결과](sources/easy-drug/OBSERVATIONS-2026-10-06.md)에 있습니다. 원문 response와 snapshot manifest는 `back/data/raw/` 아래에 있고 다른 PC에서 재사용할 수 있도록 Git으로 버전관리합니다. 정규화 파일·기계 리포트는 `back/data/` 아래에 생성되며 `.gitignore` 대상입니다.

`sources/easy-drug/`의 역할은 다음과 같습니다.

- `easy-drug.client.ts`: 단일 GET 요청, 키 인코딩/보호
- `easy-drug.collector.ts`: 단일 페이지 또는 전체 페이지 수집
- `easy-drug.types.ts`: 실제 전체 응답에서 관찰한 구조
- `easy-drug.validator.ts`: envelope와 item 필수값/필드 타입 검증
- `easy-drug.normalizer.ts`: raw item을 내부 구조로 변환
- `easy-drug.coverage.ts`: coverage와 중복 통계 계산
- `easy-drug.analysis.ts`: 저장된 raw 페이지 분석, 정규화 결과와 coverage 리포트 생성

## e약은요 이미지 URL 표본 점검

재현 가능한 이미지 접근성 표본을 확인하는 도구는 [`image-url-audit.ts`](sources/easy-drug/image-url-audit.ts)입니다. API key 없이 GET Range `bytes=0-0`을 보내고 첫 response chunk만 읽은 뒤 body를 취소합니다. 같은 HTTPS host redirect만 최대 4번 허용하며 이미지 byte나 URL 원문은 report에 저장하지 않습니다.

```powershell
node -r ts-node/register ../data-poc/sources/easy-drug/image-url-audit.ts `
  ..\data\raw\easy-drug\snapshot-2026-10-06T05-52-37.917Z 20
```

2026-10-06 실행은 같은 deterministic 20 URL 표본 모두 DNS `ENOTFOUND`로 끝났습니다. 이는 URL별 HTTP 상태가 아니므로 접근성·broken 상태 판정에 사용하지 않습니다. 시도 report는 ignored `back/data/reports/easy-drug/image-url-sample-2026-10-06-network-retry.json`에 있습니다.

## 다시 실행하기

`DATA_GO_KR_SERVICE_KEY`와 `DATA_GO_KR_SERVICE_KEY_FORMAT=ENCODED`를 `back/node/.env` 또는 실행 프로세스 환경에 설정합니다. `.env`는 Git에서 제외됩니다. 키를 README, 코드, metadata, 콘솔 출력에 복사하지 마세요.

`back/node/`에서 실행합니다.

```powershell
node --env-file=.env -r ts-node/register ../data-poc/sources/easy-drug/easy-drug.collector.ts 1 10 ..\data\raw\easy-drug\probe-YYYYMMDD-HHmmss
```

위 명령은 첫 10건을 새 probe 폴더에 저장합니다. collector는 같은 폴더의 기존 page raw를 덮어쓰지 않습니다. 전체 페이지는 별도 timestamp snapshot에 저장합니다.

```powershell
node --env-file=.env -r ts-node/register ../data-poc/sources/easy-drug/easy-drug.collector.ts --all 100 1000
```

인자는 `--all <numOfRows> <delayMs>`이며, `numOfRows=100`은 2026-10-06 실제 응답에서 허용됨을 확인했습니다. 실행 전에 현재 quota와 이용 조건을 확인하세요. 이 collector는 API 오류나 페이지 간 `totalCount` 변화가 확인되면 중단하고 받은 raw 페이지를 보존합니다.

저장된 개별 페이지를 분석하려면 인자 없이 실행합니다. 전체 snapshot은 raw 디렉터리를 지정합니다.

```powershell
node -r ts-node/register ../data-poc/sources/easy-drug/easy-drug.analysis.ts
node -r ts-node/register ../data-poc/sources/easy-drug/easy-drug.analysis.ts --directory ..\data\raw\easy-drug\snapshot-2026-10-06T05-52-37.917Z
```

분석은 `back/data/normalized/easy-drug/`에 정규화 데이터를, `back/data/reports/easy-drug/`에 기계 리포트를 생성합니다. 전체 분석은 raw snapshot directory 안에 비밀값이 없는 `snapshot-manifest.json`도 생성합니다. 원문 snapshot은 Git에 포함하며, generated normalized/report 파일은 Git 제외 대상입니다. 새 snapshot을 분석할 때는 collector가 출력한 해당 raw 디렉터리 경로를 사용하세요. 이전 임의 표본 20건은 개발 환경 DNS `ENOTFOUND`로 끝나 URL 접근성의 증거가 아닙니다. 이후 재현 표본 20건 시도는 결과 요약 전에 중단되어 분류값이 없습니다. 따라서 이미지 접근성은 아직 미측정이며, 연결 가능한 환경에서 다시 확인해야 합니다. 낱알식별 JOIN은 Phase 3 항목입니다.
