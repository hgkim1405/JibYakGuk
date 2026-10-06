# Versioned raw source snapshots

Raw API responses are tracked in Git so every checkout can continue from the same captured inputs without spending API quota or recollecting the same data. Snapshot folders are immutable: add a new timestamped folder for a later capture; do not rewrite or replace an existing response. Per-page metadata and snapshot manifests preserve capture provenance and completeness.

Generated files under `back/data/normalized/` and `back/data/reports/` remain local and ignored. Recreate them from these tracked snapshots with the commands in [`back/data-poc/README.md`](../../data-poc/README.md); this is an offline transformation and does not call the APIs.

## Credentials and content boundary

- API keys are not part of the snapshots. Keep `back/node/.env` local; Git ignores `.env` files.
- The e약은요 snapshot includes `itemImage` URL fields returned by the API, but no image files were downloaded. The right to reuse linked third-party images remains unconfirmed; do not download or redistribute those image files based on the API license alone.
- The HIRA `user-provided-sample-2026-10-06` directory is a user-supplied XML example, kept separately from live API captures and labeled in its metadata.

## Source attribution and catalog terms checked 2026-10-06

| Snapshot source | Provider / catalog | Portal license observed |
|---|---|---|
| e약은요 | MFDS / [15075057](https://www.data.go.kr/data/15075057/openapi.do) | 이용허락범위 제한 없음 |
| Product permit | MFDS / [15095677](https://www.data.go.kr/data/15095677/openapi.do) | 이용허락범위 제한 없음 |
| Pill identification | MFDS / [15057639](https://www.data.go.kr/data/15057639/openapi.do) | 이용허락범위 제한 없음 |
| Safe OTC | MFDS / [15097208](https://www.data.go.kr/data/15097208/openapi.do) | 이용허락범위 제한 없음 |
| HIRA ingredient/effect | HIRA / [15021027](https://www.data.go.kr/data/15021027/openapi.do) | 공공저작물 출처표시 제1유형; credit HIRA and link the source catalog |

These are the portal labels observed on the date shown, not a determination about separate third-party rights in linked images. Recheck source terms before publishing the data or using it outside this development repository.
