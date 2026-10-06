# Phase 3 API source inventory — 2026-10-06

This inventory separates source-contract references from locally observed live responses. Actual captures, coverage, and exact joins are summarized in [`PHASE3-OBSERVATIONS-2026-10-06.md`](PHASE3-OBSERVATIONS-2026-10-06.md); unverified field semantics remain provisional. The complete remaining work is tracked in [`handoff/TODO-ALL.md`](../../../handoff/TODO-ALL.md).

## Evidence boundary

- Public catalog metadata and HIRA operation details below were checked on 2026-10-06 at the official Data Portal pages linked in each row.
- The user-provided [`JIBYAKGUK_API_SPEC_FOR_CODEX_v2.md`](../../../docs/JIBYAKGUK_API_SPEC_FOR_CODEX_v2.md) compiles the supplied references. It confirms the DUR Base URL is still absent and transcribes an HIRA HWP minimum-filter requirement that was missing from the earlier inventory.
- Product-permit and pill-identification service URLs/operations are also recorded from the user's supplied `JIBYAKGUK_API_SPEC_FOR_CODEX.md`, which says they came from the 2026-10-06 approval screens. The full operation-level response schemas were not available in that document.
- The supplied HIRA HWP and safe-OTC DOCX guides were inspected. The HIRA guide says `gnlNmCd` values come from HIRA's separate drug-price-list operation and documents filter search patterns; the safe-OTC guide lists `PRDLST_NM`, `BSSH_NM`, `VLD_PRD_YMD`, and `STRG_MTH_CONT`.
- The local `.env` service-key variable is configured; its value was never read or printed. Live requests returned product permit, safe OTC, pill identification, and HIRA HTTP responses. Properly filtered HIRA requests returned HTTP 200 / `resultCode=00` but zero rows, including the complete sample filter set supplied by the user. The separately captured no-filter probe also returned zero rows, but the supplied HIRA HWP requires at least one search condition; do not treat that no-filter result as evidence about the dataset. The user-supplied XML example with `totalCount=1` is separately retained as user-provided evidence; it is not a locally fetched response. The discrepancy is unresolved.
- Product-permit and pill-identification full snapshots, and the complete 13-row safe-OTC response, were captured under `back/data/raw/phase3/` and are included in Git for reuse. Their counts, schemas, and exact identifier intersections are summarized in [`PHASE3-OBSERVATIONS-2026-10-06.md`](PHASE3-OBSERVATIONS-2026-10-06.md). Do not interpret the HIRA empty filtered responses as proof that the HIRA dataset is empty.
- All quotas and license labels are portal metadata observed on the date above and must be rechecked before production use. No Firestore schema or identifier bridge is inferred from metadata alone.

## Inventory

| Source | Official catalog / supplied source | What is confirmed | Still unverified |
|---|---|---|---|
| MFDS product permit information | [Catalog 15095677](https://www.data.go.kr/data/15095677/openapi.do); user-supplied API spec | Live list request succeeded. `HTTP 200`, `resultCode=00`, `totalCount=42,709`; all 42,709 rows were captured in 86 pages of 500. Observed item fields include `ITEM_SEQ`, `ITEM_NAME`, `ENTP_NAME`, `ITEM_INGR_NAME`, `BIZRNO`, and other permit fields. Exact `itemSeq === ITEM_SEQ` coverage is 4,740/4,740 unique e약은요 IDs; all 4,757 e약 rows match. `bizrno === BIZRNO` for all 4,757 exact-ID-joined rows. | Product permit and e약 values corroborate `bizrno`/`BIZRNO` equality, but the e약 response-element table omits `bizrno`; explicit e약 field definition and allowed use remain unverified. Snapshot coverage is an API response count, not a claim of all medicines ever approved. |
| MFDS DUR item information | [Catalog 15059486](https://www.data.go.kr/data/15059486/openapi.do); user-supplied API spec | REST, JSON/XML, free, unrestricted portal label, development and operations automatic approval, development 10,000/day. Official catalog describes combination, age, pregnancy contraindications, dose/duration, elderly, duplicate efficacy-group and split sustained-release warnings. Supplied spec transcribes nine operation paths. | DUR service base URL is absent from the supplied approval material; actual responses/fields, item or ingredient identifiers, request filters, pagination, coverage, and suitability for user-facing safety filtering. Do not guess the base URL or model rules from catalog descriptions. |
| MFDS safe OTC drugs | [Catalog 15097208](https://www.data.go.kr/data/15097208/openapi.do); user-supplied official DOCX guide | Live request succeeded, `HTTP 200`, `resultCode=00`, `totalCount=13`; all 13 rows captured. Observed fields: `PRDLST_NM`, `BSSH_NM`, `VLD_PRD_YMD`, `STRG_MTH_CONT`, and extra `BIZRNO`. Neither actual rows nor the guide response sample contain `itemSeq`/`ITEM_SEQ`; no exact product join can be made from this API alone. | A separate official identifier bridge, if one exists, remains unknown. |
| MFDS pill identification | [Catalog 15057639](https://www.data.go.kr/data/15057639/openapi.do); user-supplied API spec | Live list request succeeded, `HTTP 200`, `resultCode=00`, `totalCount=25,437`; 51 pages of 500 captured. Observed `ITEM_SEQ`, shape, color, dimension, imprint, image, and other fields. 25,420 unique IDs; 10 duplicate groups / 17 extra rows. Exact `itemSeq === ITEM_SEQ` matches 2,751/4,740 unique e약은요 IDs (58.0%). | 1,989 e약은요 unique IDs have no exact pill-identification record in this snapshot. This is a source-coverage result, not an assessment that those medicines cannot be visually identified by other means. |
| HIRA ingredient/effect information | [Catalog 15021027](https://www.data.go.kr/data/15021027/openapi.do); user-supplied official HWP guide and XML example | REST, XML only, free, public-work type 1 attribution, development/operations automatic approval, development 10,000/day. Operation `https://apis.data.go.kr/B551182/msupCmpnMeftInfoService/getMajorCmpnNmCdList`. Required `ServiceKey`, `numOfRows`, `pageNo`; catalog marks `gnlNmCd`, `gnlNm`, `meftDivNo`, `divNm` optional, while HWP usage instructions require at least one nonempty condition. HWP also documents 6,000-byte maximum message size and 30 TPS. `gnlNmCd` comes from HIRA's separate drug-price-list API. User-supplied XML includes fields `fomnTpCdNm`/`injcPthCdNm`; the guide also documents `fomnTpNm`/`injcPthNm` variants. | Properly filtered local HTTP 200 requests returned `resultCode=00`, `totalCount=0`, including all four user-supplied sample filters. The separately captured no-filter zero-row probe does not satisfy the HWP minimum-filter instruction and is not evidence that the dataset is empty. The supplied XML sample is not locally reproduced. HIRA-to-product ingredient/code mapping remains open pending a nonempty locally captured response and the separate drug-price-list code source. |

## Operation/request details

The following MFDS operation paths and request names are transcribed from the user's 2026-10-06 consolidated API specification (based on supplied approval/detail screens). Public catalog metadata was checked separately. Product-permit list and pill-identification list are live-verified and paginated in the observations report; detail and active-ingredient operations remain untested and their response schemas are not assumed.

### MFDS product permit information

Supplied base URL: `https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService08`

| Operation | Request names recorded in the supplied spec |
|---|---|
| `/getDrugPrdtPrmsnInq08` (list) | `serviceKey`, `pageNo`, `numOfRows`, `type`, `induty`, `spclty_pblc`, `prdlst_Stdr_code`, `entp_name`, `prduct_prmisn_no`, `item_name`, `entp_seq`, `entp_no`, `edi_code`, `item_ingr_name`, `bizrno` |
| `/getDrugPrdtPrmsnDtlInq08` (detail) | `serviceKey`, `pageNo`, `numOfRows`, `type`, `item_name`, `entp_name`, `item_permit_date`, `entp_no`, `bar_code`, `item_seq`, `start_change_date`, `end_change_date`, `edi_code`, `atc_code`, `bizrno`, `rare_drug_yn`, `main_item_ingr` |
| `/getDrugPrdtMcpnDtlInq08` (active ingredient detail) | `serviceKey`, `pageNo`, `numOfRows`, `type`, `Entrps_prmisn_no`, `Entrps`, `Item_seq`, `Prduct`, `Bizrno` |

Field capitalization and spelling above are preserved from the supplied request screens. The initial raw probe uses only `serviceKey`, `pageNo=1`, `numOfRows=10`, and `type=json`.

### MFDS DUR item information

The supplied specification records nine operation paths but explicitly does not contain a Base URL. Do not construct a URL from the operation names.

| Function | Operation | Additional request names recorded |
|---|---|---|
| Combination contraindication | `/getUsjntTabooInfoList03` | `typeName`, `ingrCode`, `itemName`, `start_change_date`, `end_change_date`, `itemSeq`, `bizrno` |
| Elderly caution | `/getOdsnAtentInfoList03` | `typeName`, `ingrCode`, `itemName`, `start_change_date`, `end_change_date`, `itemSeq` |
| DUR product item | `/getDurPrdlstInfoList03` | `itemName`, `entpName`, `start_change_date`, `end_change_date`, `itemSeq`, `bizrno`; supplied screen displayed `itemSeq` twice, so send it once pending confirmation |
| Specific age contraindication | `/getSpcifyAgrdeTabooInfoList03` | `typeName`, `ingrCode`, `itemName`, `start_change_date`, `end_change_date`, `itemSeq` |
| Dose caution | `/getCpctyAtentInfoList03` | `typeName`, `ingrCode`, `itemName`, `start_change_date`, `end_change_date`, `itemSeq` |
| Duration caution | `/getMdctnPdAtentInfoList03` | `typeName`, `ingrCode`, `itemName`, `start_change_date`, `end_change_date`, `itemSeq` |
| Duplicate efficacy group | `/getEfcyDplctInfoList03` | `typeName`, `ingrCode`, `itemName`, `start_change_date`, `end_change_date`, `itemSeq`, `bizrno` |
| Split sustained-release tablet caution | `/getSeobangjeongPartitnAtentInfoList03` | `typeName`, `itemName`, `entpName`, `start_change_date`, `end_change_date`, `itemSeq`, `bizrno` |
| Pregnancy contraindication | `/getPwnmTabooInfoList03` | `typeName`, `ingrCode`, `itemName`, `start_change_date`, `end_change_date`, `itemSeq` |

The shared request names recorded in the supplied screens are `serviceKey`, `pageNo`, `numOfRows`, and `type`. Actual Base URL, response fields, `itemSeq` coverage, and combination-record structure remain unknown.

### Safe OTC, pill identification, and HIRA

- Safe OTC official operation: `https://apis.data.go.kr/1471000/SafeStadDrugService/getSafeStadDrugInq`. Documented request names: `serviceKey`, `pageNo`, `numOfRows`, `type`, `PRDLST_NM`, `BSSH_NM`. Listed response fields: `resultCode`, `resultMsg`, `numOfRows`, `pageNo`, `totalCount`, `PRDLST_NM`, `BSSH_NM`, `VLD_PRD_YMD`, `STRG_MTH_CONT`. `itemSeq` is not listed.
- Pill identification supplied operation: `https://apis.data.go.kr/1471000/MdcinGrnIdntfcInfoService03/getMdcinGrnIdntfcInfoList03`. Request names: `serviceKey`, `pageNo`, `numOfRows`, `type`, `item_name`, `entp_name`, `item_seq`, `img_regist_ts`, `edi_code`, `bizrno`. Response element names remain unknown.
- HIRA official operation: `https://apis.data.go.kr/B551182/msupCmpnMeftInfoService/getMajorCmpnNmCdList`. Documented required request names: `ServiceKey`, `numOfRows`, `pageNo`; optional: `gnlNmCd`, `gnlNm`, `meftDivNo`, `divNm`. The user-provided HWP guide documents XML and the filter patterns; do not send a `type=json` parameter. Its guide samples list `fomnTpNm`/`injcPthNm` and also show `fomnTpCdNm`/`injcPthCdNm`; the user's separate XML shows the latter pair. Local live filtered responses had no items, so none of those item fields has been confirmed by a local HIRA response yet.
- [`phase3/hira_xml_parser.py`](phase3/hira_xml_parser.py) now parses saved XML without field aliasing, retains safe provenance and raw XML SHA-256, and was run on five local zero-item responses plus the separately marked user example. Only the user example supplies an item record in these local artifacts; it is not a live API response.

## Identifier and safety constraints

- `itemSeq` / `item_seq` / `Item_seq` are not considered interchangeable until raw values and source definitions are compared.
- HIRA `gnlNmCd` is a different identifier namespace. No `itemSeq` bridge is established yet.
- The safe OTC API's published response does not list `itemSeq`; any candidate mapping needs a verified bridge or separately documented human review.
- DUR catalog categories do not define product-level logic by themselves. Preserve each raw DUR response and model contraindication/relative warnings only after source schema and qualified review.
- Never count product-name fuzzy matching as an official identifier join.

## Sources checked

- [MFDS product permit information](https://www.data.go.kr/data/15095677/openapi.do)
- [MFDS DUR item information](https://www.data.go.kr/data/15059486/openapi.do)
- [MFDS safe OTC drugs](https://www.data.go.kr/data/15097208/openapi.do)
- [MFDS pill identification](https://www.data.go.kr/data/15057639/openapi.do)
- [HIRA ingredient/effect information](https://www.data.go.kr/data/15021027/openapi.do)
- [HIRA drug price standard information](https://www.data.go.kr/data/15054445/openapi.do) — the official catalog identifies a free HIRA health-insurance medicine master REST/XML service, public-work type 1 attribution, automatic development/operations approval, and 10,000 development requests/day. The HIRA ingredient/effect catalog directs users to the price service's `약가목록조회` response for `gnlNmCd`. The price catalog page text available during this check does not expose that operation's URL or request parameters, and the supplied HWP is for the separate ingredient/effect API; do not infer the missing contract.
- User-provided local reference: `C:\Users\kim\Downloads\JIBYAKGUK_API_SPEC_FOR_CODEX.md` (provided request/approval transcription; do not copy any service key from it into repository files).
- User-provided local references: `C:\Users\kim\Downloads\OpenAPI활용가이드_건강보험심사평가원(의약품성분약효정보조회서비스).hwp`, `C:\Users\kim\Downloads\IROS_409_안전상비의약품 정보_v1.0.docx`, and a HIRA XML sample from the user message. No API key or screenshot containing it is copied into this repository.
