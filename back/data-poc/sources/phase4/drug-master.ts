import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { EasyDrugApiItem } from "../easy-drug/easy-drug.types";
import { normalizeEasyDrugItem } from "../easy-drug/easy-drug.normalizer";
import { validateEasyDrugResponse } from "../easy-drug/easy-drug.validator";

type JsonRecord = Record<string, unknown>;
type SourceId = "easy-drug" | "product-permit" | "pill-identification" | "safe-otc";

type SourceRow = {
  value: JsonRecord;
  sourceRef: { source: SourceId; snapshot: string; rawFile: string; rowInPage: number };
};

type LoadedSnapshot = {
  source: SourceId;
  directory: string;
  snapshot: string;
  totalCount: number;
  pageSize: number;
  pages: number;
  capturedAt: string | null;
  rows: SourceRow[];
};

const sourceDirectory = __dirname;
const defaultOutputDirectory = resolve(sourceDirectory, "../../../data/normalized/drug-master");
const defaultReportDirectory = resolve(sourceDirectory, "../../../data/reports/drug-master");

function asRecord(value: unknown, description: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${description} must be a JSON object.`);
  }
  return value as JsonRecord;
}

function integerField(value: unknown, field: string, source: SourceId): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${source} snapshot has an invalid ${field}.`);
  }
  return value;
}

function requiredText(row: JsonRecord, field: string, ref: SourceRow["sourceRef"]): string {
  const value = row[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${ref.source} ${ref.rawFile} row ${ref.rowInPage} has an empty or non-text ${field}.`);
  }
  return value;
}

function optionalText(row: JsonRecord, field: string, ref: SourceRow["sourceRef"]): string | null {
  if (!Object.hasOwn(row, field)) {
    throw new Error(`${ref.source} ${ref.rawFile} row ${ref.rowInPage} is missing observed field ${field}.`);
  }
  const value = row[field];
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new Error(`${ref.source} ${ref.rawFile} row ${ref.rowInPage} has a non-text ${field}.`);
  }
  if (value.trim() === "") return null;
  return value;
}

async function loadSnapshot(directory: string, source: SourceId): Promise<LoadedSnapshot> {
  const absoluteDirectory = resolve(directory);
  const snapshot = basename(absoluteDirectory);
  const manifest = asRecord(
    JSON.parse((await readFile(resolve(absoluteDirectory, "snapshot-manifest.json"))).toString("utf8")) as unknown,
    `${source} snapshot manifest`,
  );
  if (manifest.source !== source || manifest.complete !== true) {
    throw new Error(`${source} snapshot is incomplete or has a different source identifier.`);
  }

  const manifestTotalCount = source === "easy-drug"
    ? Array.isArray(manifest.totalCountValues) && manifest.totalCountValues.length === 1
      ? manifest.totalCountValues[0]
      : undefined
    : manifest.totalCount;
  const totalCount = integerField(manifestTotalCount, "totalCount", source);
  const downloadedRows = integerField(manifest.downloadedRows, "downloadedRows", source);
  const pages = integerField(manifest.pagesDownloaded ?? manifest.expectedPages, "pagesDownloaded", source);
  if (downloadedRows !== totalCount || pages < 1) {
    throw new Error(`${source} snapshot manifest row/page counts are inconsistent.`);
  }

  const pageFiles = (await readdir(absoluteDirectory))
    .filter((file) => /^page-\d{6}\.json$/.test(file))
    .sort();
  if (pageFiles.length !== pages) throw new Error(`${source} snapshot page file count differs from its manifest.`);

  const rows: SourceRow[] = [];
  let pageSize: number | null = null;
  let expectedPages: number | null = null;
  for (let pageIndex = 0; pageIndex < pageFiles.length; pageIndex++) {
    const rawFile = pageFiles[pageIndex];
    const pageNo = pageIndex + 1;
    if (rawFile !== `page-${String(pageNo).padStart(6, "0")}.json`) {
      throw new Error(`${source} snapshot has a missing or non-sequential page at ${pageNo}.`);
    }

    const raw = JSON.parse((await readFile(resolve(absoluteDirectory, rawFile))).toString("utf8")) as unknown;
    let response: JsonRecord;
    let body: JsonRecord;
    let items: unknown[];
    if (source === "easy-drug") {
      const validated = validateEasyDrugResponse(raw);
      response = asRecord(raw, `${source} response`);
      body = asRecord(response.body, `${source} page ${pageNo} body`);
      items = validated.body.items;
      if (validated.header.resultCode !== "00") throw new Error(`${source} page ${pageNo} was not successful.`);
    } else {
      response = asRecord(raw, `${source} response`);
      const header = asRecord(response.header, `${source} page ${pageNo} header`);
      body = asRecord(response.body, `${source} page ${pageNo} body`);
      if (header.resultCode !== "00") throw new Error(`${source} page ${pageNo} was not successful.`);
      if (!Array.isArray(body.items)) throw new Error(`${source} page ${pageNo} has no item array.`);
      items = body.items;
    }

    const responsePageNo = integerField(body.pageNo, "pageNo", source);
    const responsePageSize = integerField(body.numOfRows, "numOfRows", source);
    const responseTotalCount = integerField(body.totalCount, "totalCount", source);
    if (responsePageNo !== pageNo || responseTotalCount !== totalCount || responsePageSize < 1) {
      throw new Error(`${source} page ${pageNo} has inconsistent pagination metadata.`);
    }
    if (pageSize !== null && pageSize !== responsePageSize) throw new Error(`${source} page size changed within its snapshot.`);
    pageSize = responsePageSize;
    const pageCount = Math.max(1, Math.ceil(totalCount / responsePageSize));
    if (expectedPages !== null && expectedPages !== pageCount) throw new Error(`${source} page count changed within its snapshot.`);
    expectedPages = pageCount;

    const metadata = asRecord(
      JSON.parse(
        (await readFile(resolve(absoluteDirectory, rawFile.replace(/\.json$/, ".metadata.json")))).toString("utf8"),
      ) as unknown,
      `${source} ${rawFile} metadata`,
    );
    if (
      metadata.source !== source ||
      metadata.pageNo !== pageNo ||
      metadata.numOfRows !== responsePageSize ||
      metadata.rawFile !== rawFile ||
      typeof metadata.httpStatus !== "number" || metadata.httpStatus < 200 || metadata.httpStatus >= 300
    ) {
      throw new Error(`${source} ${rawFile} request metadata does not match its response.`);
    }

    for (let index = 0; index < items.length; index++) {
      const value = asRecord(items[index], `${source} ${rawFile} item ${index + 1}`);
      rows.push({
        value,
        sourceRef: { source, snapshot, rawFile, rowInPage: index + 1 },
      });
    }
  }

  if (expectedPages !== pages || rows.length !== totalCount || pageSize === null) {
    throw new Error(`${source} snapshot failed completeness checks: rows=${rows.length}, expected=${totalCount}.`);
  }

  const capturedAt = typeof manifest.capturedAt === "string"
    ? manifest.capturedAt
    : asRecord(manifest.requestedAtRange ?? {}, `${source} request range`).last;

  return {
    source,
    directory: absoluteDirectory,
    snapshot,
    totalCount,
    pageSize,
    pages,
    capturedAt: typeof capturedAt === "string" ? capturedAt : null,
    rows,
  };
}

function groupByIdentifier(rows: SourceRow[], field: string): Map<string, SourceRow[]> {
  const grouped = new Map<string, SourceRow[]>();
  for (const row of rows) {
    const identifier = requiredText(row.value, field, row.sourceRef);
    const group = grouped.get(identifier) ?? [];
    group.push(row);
    grouped.set(identifier, group);
  }
  return grouped;
}

function easyDrugAttributes(row: JsonRecord): Record<string, string | null> {
  const normalized = normalizeEasyDrugItem(row as unknown as EasyDrugApiItem);
  return {
    itemName: normalized.itemName,
    entpName: normalized.entpName,
    efcyQesitm: normalized.efcyQesitm,
    useMethodQesitm: normalized.useMethodQesitm,
    atpnWarnQesitm: normalized.atpnWarnQesitm,
    atpnQesitm: normalized.atpnQesitm,
    intrcQesitm: normalized.intrcQesitm,
    seQesitm: normalized.seQesitm,
    depositMethodQesitm: normalized.depositMethodQesitm,
    openDe: normalized.openDe,
    updateDe: normalized.updateDe,
  };
}

function productPermitAttributes(row: JsonRecord, ref: SourceRow["sourceRef"]) {
  return {
    ITEM_NAME: requiredText(row, "ITEM_NAME", ref),
    ENTP_NAME: requiredText(row, "ENTP_NAME", ref),
    ITEM_INGR_NAME: optionalText(row, "ITEM_INGR_NAME", ref),
    ITEM_INGR_CNT: optionalText(row, "ITEM_INGR_CNT", ref),
    ITEM_PERMIT_DATE: requiredText(row, "ITEM_PERMIT_DATE", ref),
    INDUTY: optionalText(row, "INDUTY", ref),
    PRDLST_STDR_CODE: optionalText(row, "PRDLST_STDR_CODE", ref),
    PRDUCT_TYPE: optionalText(row, "PRDUCT_TYPE", ref),
  };
}

function pillIdentificationAttributes(row: JsonRecord, ref: SourceRow["sourceRef"]) {
  return {
    ITEM_NAME: requiredText(row, "ITEM_NAME", ref),
    ENTP_NAME: requiredText(row, "ENTP_NAME", ref),
    CHART: requiredText(row, "CHART", ref),
    DRUG_SHAPE: requiredText(row, "DRUG_SHAPE", ref),
    COLOR_CLASS1: optionalText(row, "COLOR_CLASS1", ref),
    COLOR_CLASS2: optionalText(row, "COLOR_CLASS2", ref),
    PRINT_FRONT: optionalText(row, "PRINT_FRONT", ref),
    PRINT_BACK: optionalText(row, "PRINT_BACK", ref),
    LINE_FRONT: optionalText(row, "LINE_FRONT", ref),
    LINE_BACK: optionalText(row, "LINE_BACK", ref),
    LENG_LONG: optionalText(row, "LENG_LONG", ref),
    LENG_SHORT: optionalText(row, "LENG_SHORT", ref),
    THICK: optionalText(row, "THICK", ref),
    FORM_CODE_NAME: optionalText(row, "FORM_CODE_NAME", ref),
    CLASS_NO: optionalText(row, "CLASS_NO", ref),
    CLASS_NAME: optionalText(row, "CLASS_NAME", ref),
    ETC_OTC_NAME: optionalText(row, "ETC_OTC_NAME", ref),
    STD_CD: optionalText(row, "STD_CD", ref),
  };
}

function safeOtcAttributes(row: JsonRecord, ref: SourceRow["sourceRef"]) {
  return {
    PRDLST_NM: requiredText(row, "PRDLST_NM", ref),
    BSSH_NM: requiredText(row, "BSSH_NM", ref),
    VLD_PRD_YMD: requiredText(row, "VLD_PRD_YMD", ref),
    STRG_MTH_CONT: requiredText(row, "STRG_MTH_CONT", ref),
  };
}

function sourceSummary(snapshot: LoadedSnapshot) {
  return {
    snapshot: snapshot.snapshot,
    capturedAt: snapshot.capturedAt,
    totalCount: snapshot.totalCount,
    downloadedRows: snapshot.rows.length,
    pageSize: snapshot.pageSize,
    pages: snapshot.pages,
  };
}

export async function buildDrugMaster(
  easyDrugDirectory: string,
  productPermitDirectory: string,
  pillIdentificationDirectory: string,
  safeOtcDirectory: string,
  outputPath = resolve(defaultOutputDirectory, `drug-master-v1-${new Date().toISOString().replaceAll(":", "-")}.json`),
) {
  const [easy, permit, pill, safe] = await Promise.all([
    loadSnapshot(easyDrugDirectory, "easy-drug"),
    loadSnapshot(productPermitDirectory, "product-permit"),
    loadSnapshot(pillIdentificationDirectory, "pill-identification"),
    loadSnapshot(safeOtcDirectory, "safe-otc"),
  ]);

  const permitsById = groupByIdentifier(permit.rows, "ITEM_SEQ");
  const easyById = groupByIdentifier(easy.rows, "itemSeq");
  const pillsById = groupByIdentifier(pill.rows, "ITEM_SEQ");
  const duplicatePermitIds = [...permitsById.entries()].filter(([, rows]) => rows.length > 1);
  if (duplicatePermitIds.length > 0) {
    throw new Error(`Product-permit snapshot has ${duplicatePermitIds.length} duplicate ITEM_SEQ identifiers; master identity is ambiguous.`);
  }

  const masterIds = new Set(permitsById.keys());
  const linkedEasyIds = [...easyById.keys()].filter((id) => masterIds.has(id));
  const linkedPillIds = [...pillsById.keys()].filter((id) => masterIds.has(id));
  const drugs = [...permitsById.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([itemSeq, [permitRow]]) => {
      const easyRows = easyById.get(itemSeq) ?? [];
      const pillRows = pillsById.get(itemSeq) ?? [];
      return {
        drugId: `mfds-item-seq:${itemSeq}`,
        externalIdentifiers: { mfdsItemSeq: itemSeq },
        productPermit: {
          attributes: productPermitAttributes(permitRow.value, permitRow.sourceRef),
          sourceRef: permitRow.sourceRef,
        },
        easyDrug: easyRows.map((row) => ({
          attributes: easyDrugAttributes(row.value),
          sourceRef: row.sourceRef,
        })),
        pillIdentification: pillRows.map((row) => ({
          attributes: pillIdentificationAttributes(row.value, row.sourceRef),
          sourceRef: row.sourceRef,
        })),
      };
    });

  const unlinkedEasyDrug = easy.rows
    .filter((row) => !masterIds.has(requiredText(row.value, "itemSeq", row.sourceRef)))
    .map((row) => ({
      identifier: requiredText(row.value, "itemSeq", row.sourceRef),
      attributes: easyDrugAttributes(row.value),
      sourceRef: row.sourceRef,
    }));
  const unlinkedPillIdentification = pill.rows
    .filter((row) => !masterIds.has(requiredText(row.value, "ITEM_SEQ", row.sourceRef)))
    .map((row) => ({
      identifier: requiredText(row.value, "ITEM_SEQ", row.sourceRef),
      attributes: pillIdentificationAttributes(row.value, row.sourceRef),
      sourceRef: row.sourceRef,
    }));
  const unlinkedSafeOtc = safe.rows.map((row) => ({
    attributes: safeOtcAttributes(row.value, row.sourceRef),
    sourceRef: row.sourceRef,
  }));

  const generatedAt = new Date().toISOString();
  const output = {
    schemaVersion: "1.0.0",
    generatedAt,
    identityRule: "drugId = mfds-item-seq:<exact product-permit ITEM_SEQ>; cross-source joins use exact string equality only.",
    fieldPolicy: {
      sourceValuesRemainSeparate: true,
      missingOrNullOptionalText: null,
      rawReferencesUseOneBasedRowInPage: true,
      omittedUntilRightsOrDefinitionAreVerified: ["image URL fields", "BIZRNO"],
      noSafetyInterpretationOrFuzzyJoin: true,
    },
    sources: {
      productPermit: sourceSummary(permit),
      easyDrug: sourceSummary(easy),
      pillIdentification: sourceSummary(pill),
      safeOtc: sourceSummary(safe),
    },
    summary: {
      drugMasterRecords: drugs.length,
      exactJoins: {
        easyDrugUniqueIdsMatched: linkedEasyIds.length,
        easyDrugUniqueIds: easyById.size,
        easyDrugRowsMatched: easy.rows.filter((row) => masterIds.has(requiredText(row.value, "itemSeq", row.sourceRef))).length,
        pillIdentificationUniqueIdsMatched: linkedPillIds.length,
        pillIdentificationUniqueIds: pillsById.size,
        pillIdentificationRowsMatched: pill.rows.filter((row) => masterIds.has(requiredText(row.value, "ITEM_SEQ", row.sourceRef))).length,
      },
      duplicateGroupsPreserved: {
        easyDrug: [...easyById.values()].filter((rows) => rows.length > 1).length,
        pillIdentification: [...pillsById.values()].filter((rows) => rows.length > 1).length,
      },
      unlinkedRecords: {
        easyDrug: unlinkedEasyDrug.length,
        pillIdentification: unlinkedPillIdentification.length,
        safeOtc: unlinkedSafeOtc.length,
      },
    },
    drugs,
    unlinkedSources: {
      easyDrug: unlinkedEasyDrug,
      pillIdentification: unlinkedPillIdentification,
      safeOtc: unlinkedSafeOtc,
    },
  };

  const outputDirectory = resolve(outputPath, "..");
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, { encoding: "utf8", flag: "wx" });

  const report = {
    schemaVersion: output.schemaVersion,
    generatedAt,
    sourceSnapshots: output.sources,
    summary: output.summary,
    validation: {
      productPermitIdentifierUnique: duplicatePermitIds.length === 0,
      exactJoinRule: "literal string equality on ITEM_SEQ/itemSeq",
      pageCountsAndRowCountsMatchSnapshotManifests: true,
      sourceReferences: "rawFile + one-based rowInPage",
    },
    outputFile: basename(outputPath),
  };
  const reportPath = resolve(defaultReportDirectory, `${basename(outputPath, ".json")}-report.json`);
  await mkdir(defaultReportDirectory, { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return { outputPath, reportPath, report };
}

if (require.main === module) {
  const [easyDrugDirectory, productPermitDirectory, pillIdentificationDirectory, safeOtcDirectory, outputPath] = process.argv.slice(2);
  if (!easyDrugDirectory || !productPermitDirectory || !pillIdentificationDirectory || !safeOtcDirectory) {
    process.stderr.write("Usage: node -r ts-node/register drug-master.ts <easyDrugSnapshot> <productPermitSnapshot> <pillIdentificationSnapshot> <safeOtcSnapshot> [outputJson]\n");
    process.exitCode = 2;
  } else {
    buildDrugMaster(easyDrugDirectory, productPermitDirectory, pillIdentificationDirectory, safeOtcDirectory, outputPath)
      .then(({ outputPath: savedPath, reportPath, report }) => {
        process.stdout.write(`Drug Master saved: ${savedPath}\nReport saved: ${reportPath}\n`);
        process.stdout.write(`${JSON.stringify(report.summary, null, 2)}\n`);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Unknown Drug Master error.";
        process.stderr.write(`${message}\n`);
        process.exitCode = 1;
      });
  }
}
