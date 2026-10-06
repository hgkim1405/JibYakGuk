import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

type JsonRecord = Record<string, unknown>;
type SourceRow = { attributes: JsonRecord; sourceRef: JsonRecord };
type Drug = {
  drugId: string;
  productPermit: SourceRow;
  easyDrug: SourceRow[];
  pillIdentification: SourceRow[];
};
type SourceKey = "productPermit" | "easyDrug" | "pillIdentification";
type Master = {
  path: string;
  generatedAt: unknown;
  sources: JsonRecord;
  drugs: Drug[];
  byId: Map<string, Drug>;
  unlinked: { easyDrug: unknown[]; pillIdentification: unknown[]; safeOtc: unknown[] };
};

const sourceDirectory = __dirname;
const defaultReportDirectory = resolve(sourceDirectory, "../../../data/reports/phase5");
const sourceKeys: SourceKey[] = ["productPermit", "easyDrug", "pillIdentification"];

function asRecord(value: unknown, label: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(label + " must be a JSON object.");
  }
  return value as JsonRecord;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (typeof value === "object" && value !== null) {
    const record = value as JsonRecord;
    return "{" + Object.keys(record).sort().map((key) => JSON.stringify(key) + ":" + canonical(record[key])).join(",") + "}";
  }
  return JSON.stringify(value) ?? "undefined";
}

function parseSourceRow(value: unknown, label: string): SourceRow {
  const row = asRecord(value, label);
  return {
    attributes: asRecord(row.attributes, label + ".attributes"),
    sourceRef: asRecord(row.sourceRef, label + ".sourceRef"),
  };
}

function parseDrug(value: unknown, index: number): Drug {
  const row = asRecord(value, "Drug Master drugs[" + index + "]");
  const identifiers = asRecord(row.externalIdentifiers, "Drug Master drugs[" + index + "].externalIdentifiers");
  const itemSeq = identifiers.mfdsItemSeq;
  if (typeof row.drugId !== "string" || typeof itemSeq !== "string" || row.drugId !== "mfds-item-seq:" + itemSeq) {
    throw new Error("Drug Master drugs[" + index + "] has an invalid drugId mapping.");
  }
  if (!Array.isArray(row.easyDrug) || !Array.isArray(row.pillIdentification)) {
    throw new Error("Drug Master drugs[" + index + "] source rows must be arrays.");
  }
  return {
    drugId: row.drugId,
    productPermit: parseSourceRow(row.productPermit, "Drug Master drugs[" + index + "].productPermit"),
    easyDrug: row.easyDrug.map((entry, rowIndex) => parseSourceRow(entry, "Drug Master drugs[" + index + "].easyDrug[" + rowIndex + "]")),
    pillIdentification: row.pillIdentification.map((entry, rowIndex) => parseSourceRow(entry, "Drug Master drugs[" + index + "].pillIdentification[" + rowIndex + "]")),
  };
}

async function loadMaster(path: string): Promise<Master> {
  const master = asRecord(JSON.parse((await readFile(resolve(path))).toString("utf8")) as unknown, "Drug Master");
  if (master.schemaVersion !== "1.0.0" || !Array.isArray(master.drugs) || master.drugs.length === 0) {
    throw new Error("Each input must be a non-empty Drug Master v1 document.");
  }
  const drugs = master.drugs.map(parseDrug);
  const byId = new Map<string, Drug>();
  for (const drug of drugs) {
    if (byId.has(drug.drugId)) throw new Error("Drug Master has duplicate drugId " + drug.drugId + ".");
    byId.set(drug.drugId, drug);
  }
  const sources = asRecord(master.sources, "Drug Master sources");
  const rawUnlinked = asRecord(master.unlinkedSources, "Drug Master unlinkedSources");
  const unlinked: Master["unlinked"] = { easyDrug: [], pillIdentification: [], safeOtc: [] };
  for (const key of ["easyDrug", "pillIdentification", "safeOtc"] as const) {
    if (!Array.isArray(rawUnlinked[key])) throw new Error("Drug Master unlinkedSources." + key + " must be an array.");
    unlinked[key] = rawUnlinked[key] as unknown[];
  }
  return { path: resolve(path), generatedAt: master.generatedAt ?? null, sources, drugs, byId, unlinked };
}

function rowsFor(drug: Drug, source: SourceKey): SourceRow[] {
  return source === "productPermit" ? [drug.productPermit] : drug[source];
}

function multiset(values: unknown[]): string[] {
  return values.map(canonical).sort();
}

function fieldsChanged(previous: SourceRow[], current: SourceRow[]): string[] {
  const fieldNames = new Set([...previous, ...current].flatMap((row) => Object.keys(row.attributes)));
  return [...fieldNames].sort().filter((field) => {
    const oldValues = multiset(previous.map((row) => Object.hasOwn(row.attributes, field)
      ? row.attributes[field]
      : { missingField: true }));
    const newValues = multiset(current.map((row) => Object.hasOwn(row.attributes, field)
      ? row.attributes[field]
      : { missingField: true }));
    return canonical(oldValues) !== canonical(newValues);
  });
}

function refsFor(drug: Drug) {
  return {
    productPermit: [drug.productPermit.sourceRef],
    easyDrug: drug.easyDrug.map((row) => row.sourceRef),
    pillIdentification: drug.pillIdentification.map((row) => row.sourceRef),
  };
}

function linkedCoverage(drugs: Drug[], source: "easyDrug" | "pillIdentification") {
  return {
    rows: drugs.reduce((total, drug) => total + drug[source].length, 0),
    productsWithRows: drugs.filter((drug) => drug[source].length > 0).length,
  };
}

function unlinkedIdentifierDelta(previousRows: unknown[], currentRows: unknown[], label: string) {
  type ContentGroup = { count: number; refs: JsonRecord[] };
  const groupRows = (rows: unknown[], side: string) => {
    const byId = new Map<string, Map<string, ContentGroup>>();
    rows.forEach((value, index) => {
      const row = asRecord(value, label + " " + side + "[" + index + "]");
      if (typeof row.identifier !== "string" || row.identifier.length === 0) {
        throw new Error(label + " " + side + "[" + index + "] has an invalid identifier.");
      }
      const attrs = asRecord(row.attributes, label + " " + side + "[" + index + "].attributes");
      const ref = asRecord(row.sourceRef, label + " " + side + "[" + index + "].sourceRef");
      const contentKey = canonical(attrs);
      const contents = byId.get(row.identifier) ?? new Map<string, ContentGroup>();
      const group = contents.get(contentKey) ?? { count: 0, refs: [] };
      group.count++;
      if (group.refs.length < 20) group.refs.push(ref);
      contents.set(contentKey, group);
      byId.set(row.identifier, contents);
    });
    return byId;
  };
  const oldById = groupRows(previousRows, "previous");
  const newById = groupRows(currentRows, "current");
  const ids = [...new Set([...oldById.keys(), ...newById.keys()])].sort();
  const addedIdentifiers: string[] = [];
  const removedIdentifiers: string[] = [];
  const changedIdentifiers: string[] = [];
  const examples: Array<Record<string, unknown>> = [];
  let addedRows = 0;
  let removedRows = 0;
  let unchangedRows = 0;

  for (const identifier of ids) {
    const oldContents = oldById.get(identifier) ?? new Map<string, ContentGroup>();
    const newContents = newById.get(identifier) ?? new Map<string, ContentGroup>();
    const contentKeys = new Set([...oldContents.keys(), ...newContents.keys()]);
    let idAdded = 0;
    let idRemoved = 0;
    let idUnchanged = 0;
    for (const key of contentKeys) {
      const oldGroup = oldContents.get(key);
      const newGroup = newContents.get(key);
      const oldCount = oldGroup?.count ?? 0;
      const newCount = newGroup?.count ?? 0;
      idAdded += Math.max(0, newCount - oldCount);
      idRemoved += Math.max(0, oldCount - newCount);
      idUnchanged += Math.min(oldCount, newCount);
    }
    addedRows += idAdded;
    removedRows += idRemoved;
    unchangedRows += idUnchanged;
    if (oldContents.size === 0) addedIdentifiers.push(identifier);
    else if (newContents.size === 0) removedIdentifiers.push(identifier);
    else if (idAdded > 0 || idRemoved > 0) changedIdentifiers.push(identifier);
    if ((idAdded > 0 || idRemoved > 0) && examples.length < 100) {
      examples.push({
        identifier,
        addedRows: idAdded,
        removedRows: idRemoved,
        previousSourceRefs: [...oldContents.values()].flatMap((group) => group.refs).slice(0, 20),
        currentSourceRefs: [...newContents.values()].flatMap((group) => group.refs).slice(0, 20),
      });
    }
  }
  return {
    previousRows: previousRows.length,
    currentRows: currentRows.length,
    unchangedRows,
    addedRows,
    removedRows,
    addedIdentifiers,
    removedIdentifiers,
    changedIdentifiers,
    examples,
    examplesLimit: 100,
  };
}

function safeOtcDelta(previousRows: unknown[], currentRows: unknown[]) {
  const getAttributes = (rows: unknown[], label: string) => rows.map((value, index) =>
    canonical(asRecord(asRecord(value, label + "[" + index + "]").attributes, label + "[" + index + "].attributes")));
  const oldCounts = countBy(getAttributes(previousRows, "previous safeOtc"));
  const newCounts = countBy(getAttributes(currentRows, "current safeOtc"));
  let added = 0;
  let removed = 0;
  for (const [value, count] of oldCounts) removed += Math.max(0, count - (newCounts.get(value) ?? 0));
  for (const [value, count] of newCounts) added += Math.max(0, count - (oldCounts.get(value) ?? 0));
  return {
    previousRows: previousRows.length,
    currentRows: currentRows.length,
    unchangedContentRows: previousRows.length - removed,
    addedContentRows: added,
    removedContentRows: removed,
  };
}

function countBy(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function digest(values: string[]): string {
  return createHash("sha256").update(values.join("\n"), "utf8").digest("hex");
}

export async function compareDrugMasterSnapshots(
  previousPath: string,
  currentPath: string,
  reportPath = resolve(defaultReportDirectory, "drug-master-diff-" + new Date().toISOString().replaceAll(":", "-") + ".json"),
) {
  const [previous, current] = await Promise.all([loadMaster(previousPath), loadMaster(currentPath)]);
  const oldIds = new Set(previous.byId.keys());
  const newIds = new Set(current.byId.keys());
  const addedIds = [...newIds].filter((id) => !oldIds.has(id)).sort();
  const removedIds = [...oldIds].filter((id) => !newIds.has(id)).sort();
  const commonIds = [...oldIds].filter((id) => newIds.has(id)).sort();
  const changedIds = new Set<string>();
  const changedProductFields: Record<string, number> = {};
  const changedExamples: Array<Record<string, unknown>> = [];

  for (const drugId of commonIds) {
    const oldDrug = previous.byId.get(drugId)!;
    const newDrug = current.byId.get(drugId)!;
    const changedSources: Partial<Record<SourceKey, string[]>> = {};
    for (const source of sourceKeys) {
      const oldRows = rowsFor(oldDrug, source);
      const newRows = rowsFor(newDrug, source);
      const fields = fieldsChanged(oldRows, newRows);
      const oldContent = multiset(oldRows.map((row) => row.attributes));
      const newContent = multiset(newRows.map((row) => row.attributes));
      if (fields.length === 0 && canonical(oldContent) !== canonical(newContent)) {
        fields.push("<row-composition>");
      }
      if (fields.length === 0) continue;
      changedSources[source] = fields;
      changedIds.add(drugId);
      for (const field of fields) {
        const key = source + "." + field;
        changedProductFields[key] = (changedProductFields[key] ?? 0) + 1;
      }
    }
    if (Object.keys(changedSources).length > 0 && changedExamples.length < 100) {
      changedExamples.push({
        drugId,
        changedSources,
        previousSourceRefs: refsFor(oldDrug),
        currentSourceRefs: refsFor(newDrug),
      });
    }
  }

  const unchangedContent = commonIds.length - changedIds.size;
  const generatedAt = new Date().toISOString();
  const report = {
    reportVersion: "1.0.0",
    generatedAt,
    previousMaster: basename(previous.path),
    currentMaster: basename(current.path),
    previousMasterGeneratedAt: previous.generatedAt,
    currentMasterGeneratedAt: current.generatedAt,
    snapshots: { previous: previous.sources, current: current.sources },
    comparisonPolicy: {
      identity: "exact drugId equality",
      content: "exact source attribute values; object-key and source-row order are ignored; duplicate rows remain a multiset",
      ignored: ["master generatedAt", "sourceRef snapshot/page/row changes"],
      safeOtc: "compare exact attribute-row content as a multiset; do not infer a product identity or name-based join",
    },
    productCounts: {
      previous: previous.byId.size,
      current: current.byId.size,
      added: addedIds.length,
      removed: removedIds.length,
      unchangedContent,
      changedContent: changedIds.size,
      addedDrugIds: addedIds,
      removedDrugIds: removedIds,
      addedDrugIdsSha256: digest(addedIds),
      removedDrugIdsSha256: digest(removedIds),
      changedProductFields,
      changedExamples,
      changedExamplesLimit: 100,
    },
    sourceCoverage: {
      easyDrug: {
        previousLinked: linkedCoverage(previous.drugs, "easyDrug"),
        currentLinked: linkedCoverage(current.drugs, "easyDrug"),
        previousUnlinkedRows: previous.unlinked.easyDrug.length,
        currentUnlinkedRows: current.unlinked.easyDrug.length,
        unlinkedContent: unlinkedIdentifierDelta(previous.unlinked.easyDrug, current.unlinked.easyDrug, "easyDrug unlinked"),
      },
      pillIdentification: {
        previousLinked: linkedCoverage(previous.drugs, "pillIdentification"),
        currentLinked: linkedCoverage(current.drugs, "pillIdentification"),
        previousUnlinkedRows: previous.unlinked.pillIdentification.length,
        currentUnlinkedRows: current.unlinked.pillIdentification.length,
        unlinkedContent: unlinkedIdentifierDelta(previous.unlinked.pillIdentification, current.unlinked.pillIdentification, "pill-identification unlinked"),
      },
      safeOtc: safeOtcDelta(previous.unlinked.safeOtc, current.unlinked.safeOtc),
    },
    interpretation: "This report compares source attributes, not clinical equivalence, approval status, or safety. Changed examples retain source references for raw review.",
  };

  await mkdir(resolve(reportPath, ".."), { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
  return { reportPath, report };
}

if (require.main === module) {
  const [previousPath, currentPath, reportPath] = process.argv.slice(2);
  if (!previousPath || !currentPath) {
    process.stderr.write("Usage: node -r ts-node/register snapshot-diff.ts <previousDrugMasterJson> <currentDrugMasterJson> [reportJson]\n");
    process.exitCode = 2;
  } else {
    compareDrugMasterSnapshots(previousPath, currentPath, reportPath)
      .then(({ reportPath: savedPath, report }) => {
        process.stdout.write("Phase 5 snapshot diff saved: " + savedPath + "\n");
        process.stdout.write(JSON.stringify({ productCounts: report.productCounts, sourceCoverage: report.sourceCoverage }, null, 2) + "\n");
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Unknown snapshot diff error.";
        process.stderr.write(message + "\n");
        process.exitCode = 1;
      });
  }
}
