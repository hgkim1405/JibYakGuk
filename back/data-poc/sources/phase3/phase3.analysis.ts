import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

type JsonRow = Record<string, unknown>;

type LoadedSource = {
  directory: string;
  rows: JsonRow[];
  totalCount: number;
  pages: number;
};

const defaultReportDirectory = resolve(__dirname, "../../../data/reports/phase3");

async function loadJsonSource(directory: string): Promise<LoadedSource> {
  const files = (await readdir(directory))
    .filter((name) => /^page-\d+\.json$/.test(name))
    .sort();
  if (files.length === 0) throw new Error(`No JSON page files were found in ${directory}.`);

  const rows: JsonRow[] = [];
  let expectedTotalCount: number | null = null;
  for (const file of files) {
    const pageMatch = /^page-(\d+)\.json$/.exec(file);
    const requestedPageNo = pageMatch ? Number(pageMatch[1]) : NaN;
    const root = JSON.parse((await readFile(resolve(directory, file))).toString("utf8")) as unknown;
    if (typeof root !== "object" || root === null) throw new Error(`${file} did not contain a JSON object.`);
    const response = root as Record<string, unknown>;
    const header = response.header;
    const body = response.body;
    if (typeof header !== "object" || header === null || typeof body !== "object" || body === null) {
      throw new Error(`${file} did not match the observed JSON envelope.`);
    }
    const headerRecord = header as Record<string, unknown>;
    const bodyRecord = body as Record<string, unknown>;
    if (headerRecord.resultCode !== "00") throw new Error(`${file} is not an API success response.`);
    if (
      bodyRecord.pageNo !== requestedPageNo ||
      typeof bodyRecord.totalCount !== "number" ||
      !Number.isInteger(bodyRecord.totalCount) ||
      !Array.isArray(bodyRecord.items)
    ) {
      throw new Error(`${file} has invalid pagination or item fields.`);
    }
    if (expectedTotalCount !== null && bodyRecord.totalCount !== expectedTotalCount) {
      throw new Error(`${file} totalCount differs from earlier pages.`);
    }
    expectedTotalCount = bodyRecord.totalCount;
    rows.push(...(bodyRecord.items as JsonRow[]));
  }

  const totalCount = expectedTotalCount ?? 0;
  if (rows.length !== totalCount) {
    throw new Error(`${basename(directory)} contains ${rows.length} rows; its API totalCount is ${totalCount}.`);
  }
  return { directory, rows, totalCount, pages: files.length };
}

function idStats(rows: JsonRow[], field: string) {
  const values = rows.map((row) => row[field]);
  const ids = values.filter((value): value is string => typeof value === "string" && value.length > 0);
  const frequencies = new Map<string, number>();
  for (const id of ids) frequencies.set(id, (frequencies.get(id) ?? 0) + 1);
  const duplicateGroups = [...frequencies.values()].filter((count) => count > 1);
  const groups = new Map<string, JsonRow[]>();
  for (const row of rows) {
    const id = row[field];
    if (typeof id !== "string" || id.length === 0) continue;
    const group = groups.get(id) ?? [];
    group.push(row);
    groups.set(id, group);
  }
  const varyingFields = new Set<string>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    for (const key of new Set(group.flatMap((row) => Object.keys(row)))) {
      if (new Set(group.map((row) => JSON.stringify(row[key]))).size > 1) varyingFields.add(key);
    }
  }

  return {
    field,
    rows: rows.length,
    nonEmptyStringRows: ids.length,
    uniqueIds: frequencies.size,
    duplicateGroups: duplicateGroups.length,
    duplicateExtraRows: ids.length - frequencies.size,
    invalidOrEmptyRows: rows.length - ids.length,
    varyingFieldsInDuplicateGroups: [...varyingFields].sort(),
    values: new Set(ids),
  };
}

function exactJoin(sourceRows: JsonRow[], sourceField: string, targetIds: Set<string>, targetCount: number) {
  const source = idStats(sourceRows, sourceField);
  const matchedUniqueIds = [...source.values].filter((id) => targetIds.has(id)).length;
  const matchedRows = sourceRows.filter((row) => typeof row[sourceField] === "string" && targetIds.has(row[sourceField] as string)).length;
  return {
    sourceRows: source.rows,
    sourceUniqueIds: source.uniqueIds,
    targetUniqueIds: targetCount,
    matchedUniqueIds,
    unmatchedUniqueIds: source.uniqueIds - matchedUniqueIds,
    sourceUniqueIdMatchRate: source.uniqueIds === 0 ? null : matchedUniqueIds / source.uniqueIds,
    matchedRows,
    unmatchedRows: source.rows - matchedRows,
    rowMatchRate: source.rows === 0 ? null : matchedRows / source.rows,
    matchRule: `exact string equality: ${sourceField}`,
  };
}

function fieldCoverage(rows: JsonRow[]) {
  const fieldNames = new Set(rows.flatMap((row) => Object.keys(row)));
  return [...fieldNames].sort().map((field) => {
    let present = 0;
    let nullValues = 0;
    let emptyStrings = 0;
    for (const row of rows) {
      if (!Object.hasOwn(row, field)) continue;
      present++;
      if (row[field] === null) nullValues++;
      if (row[field] === "") emptyStrings++;
    }
    return { field, present, missing: rows.length - present, nullValues, emptyStrings };
  });
}

export async function analyzePhase3Sources(
  easyDrugDirectory: string,
  productPermitDirectory: string,
  pillIdentificationDirectory: string,
  safeOtcDirectory: string,
  outputPath = resolve(defaultReportDirectory, `phase3-crosswalk-${new Date().toISOString().replaceAll(":", "-")}.json`),
) {
  const [easy, permit, pill, safe] = await Promise.all([
    loadJsonSource(resolve(easyDrugDirectory)),
    loadJsonSource(resolve(productPermitDirectory)),
    loadJsonSource(resolve(pillIdentificationDirectory)),
    loadJsonSource(resolve(safeOtcDirectory)),
  ]);
  const easyIds = idStats(easy.rows, "itemSeq");
  const permitIds = idStats(permit.rows, "ITEM_SEQ");
  const pillIds = idStats(pill.rows, "ITEM_SEQ");
  const safeHasItemSeq = safe.rows.some((row) => typeof row.ITEM_SEQ === "string" && row.ITEM_SEQ.length > 0);
  const permitById = new Map(permit.rows.map((row) => [row.ITEM_SEQ, row]));
  let bizrnoCompared = 0;
  let bizrnoExactMatches = 0;
  let bizrnoMissing = 0;
  let bizrnoDifferences = 0;
  for (const row of easy.rows) {
    const permitRow = permitById.get(row.itemSeq);
    if (!permitRow) {
      bizrnoMissing++;
      continue;
    }
    bizrnoCompared++;
    if (typeof row.bizrno !== "string" || typeof permitRow.BIZRNO !== "string") bizrnoMissing++;
    else if (row.bizrno === permitRow.BIZRNO) bizrnoExactMatches++;
    else bizrnoDifferences++;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    sourceSnapshots: {
      easyDrug: { directory: basename(easy.directory), rows: easy.totalCount, pages: easy.pages },
      productPermit: { directory: basename(permit.directory), rows: permit.totalCount, pages: permit.pages },
      pillIdentification: { directory: basename(pill.directory), rows: pill.totalCount, pages: pill.pages },
      safeOtc: { directory: basename(safe.directory), rows: safe.totalCount, pages: safe.pages },
    },
    identifierStats: {
      easyDrug: { ...easyIds, values: undefined },
      productPermit: { ...permitIds, values: undefined },
      pillIdentification: { ...pillIds, values: undefined },
      safeOtc: {
        rows: safe.rows.length,
        itemSeqFieldPresent: safeHasItemSeq,
        note: safeHasItemSeq ? "ITEM_SEQ observed in at least one row." : "No ITEM_SEQ field value was observed; exact itemSeq join is unavailable from this response." ,
      },
    },
    exactIdentifierJoins: {
      easyDrugToProductPermit: exactJoin(easy.rows, "itemSeq", permitIds.values, permitIds.uniqueIds),
      easyDrugToPillIdentification: exactJoin(easy.rows, "itemSeq", pillIds.values, pillIds.uniqueIds),
      productPermitToPillIdentification: exactJoin(permit.rows, "ITEM_SEQ", pillIds.values, pillIds.uniqueIds),
    },
    easyDrugBizrnoComparisonWithProductPermit: {
      comparisonBasis: "Rows joined by exact itemSeq === ITEM_SEQ; then bizrno === BIZRNO exact string equality.",
      comparedRows: bizrnoCompared,
      exactMatches: bizrnoExactMatches,
      missingValuesOrPermitRows: bizrnoMissing,
      differingValues: bizrnoDifferences,
      interpretation: "Cross-source value agreement is empirical evidence; it does not replace an explicit e약은요 field definition or permitted-use statement.",
    },
    fieldCoverage: {
      productPermit: fieldCoverage(permit.rows),
      pillIdentification: fieldCoverage(pill.rows),
      safeOtc: fieldCoverage(safe.rows),
    },
  };

  await mkdir(resolve(outputPath, ".."), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return { outputPath, report };
}

if (require.main === module) {
  const [easyDrugDirectory, productPermitDirectory, pillIdentificationDirectory, safeOtcDirectory, outputPath] = process.argv.slice(2);
  if (!easyDrugDirectory || !productPermitDirectory || !pillIdentificationDirectory || !safeOtcDirectory) {
    process.stderr.write("Usage: node -r ts-node/register phase3.analysis.ts <easyDrugRawDir> <productPermitRawDir> <pillIdentificationRawDir> <safeOtcRawDir> [outputJson]\n");
    process.exitCode = 2;
  } else {
    analyzePhase3Sources(easyDrugDirectory, productPermitDirectory, pillIdentificationDirectory, safeOtcDirectory, outputPath)
      .then(({ outputPath: savedPath, report }) => {
        process.stdout.write(`Analysis report saved: ${savedPath}\n`);
        process.stdout.write(`${JSON.stringify(report.exactIdentifierJoins, null, 2)}\n`);
        process.stdout.write(`${JSON.stringify(report.easyDrugBizrnoComparisonWithProductPermit, null, 2)}\n`);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Unknown analysis error.";
        process.stderr.write(`${message}\n`);
        process.exitCode = 1;
      });
  }
}
