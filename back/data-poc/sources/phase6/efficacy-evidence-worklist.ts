import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

type JsonRecord = Record<string, unknown>;
type SourceRef = {
  source: string;
  snapshot: string;
  rawFile: string;
  rowInPage: number;
};

const sourceDirectory = __dirname;
const defaultOutputDirectory = resolve(sourceDirectory, "../../../data/normalized/phase6-efficacy");

function asRecord(value: unknown, label: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return value as JsonRecord;
}

function sourceRef(value: unknown, label: string): SourceRef {
  const ref = asRecord(value, label);
  if (
    ref.source !== "easy-drug" ||
    typeof ref.snapshot !== "string" || ref.snapshot.length === 0 ||
    typeof ref.rawFile !== "string" || !/^page-\d{6}\.json$/.test(ref.rawFile) ||
    typeof ref.rowInPage !== "number" || !Number.isInteger(ref.rowInPage) || ref.rowInPage < 1
  ) {
    throw new Error(`${label} is not a valid e약은요 source reference.`);
  }
  return {
    source: "easy-drug",
    snapshot: ref.snapshot,
    rawFile: ref.rawFile,
    rowInPage: ref.rowInPage,
  };
}

function stableEvidenceId(drugId: string, ref: SourceRef): string {
  const identity = [drugId, ref.snapshot, ref.rawFile, ref.rowInPage].join("\n");
  return `sha256:${createHash("sha256").update(identity, "utf8").digest("hex")}`;
}

export async function buildEfficacyEvidenceWorklist(
  masterPath: string,
  outputPath = resolve(defaultOutputDirectory, `efficacy-evidence-${new Date().toISOString().replaceAll(":", "-")}.json`),
) {
  const master = asRecord(JSON.parse((await readFile(resolve(masterPath))).toString("utf8")) as unknown, "Drug Master");
  if (master.schemaVersion !== "1.0.0" || !Array.isArray(master.drugs) || master.drugs.length === 0) {
    throw new Error("Input must be a non-empty Drug Master v1 document.");
  }
  const sourceSnapshots = asRecord(master.sources, "Drug Master sources");
  const evidence: Array<{
    evidenceId: string;
    drugId: string;
    source: "easy-drug";
    sourceText: string;
    sourceItemName: string | null;
    sourceRef: SourceRef;
    reviewStatus: "pending";
    reviewedConcepts: [];
  }> = [];
  let sourceRows = 0;
  let emptyOrNullEfficacy = 0;

  for (let drugIndex = 0; drugIndex < master.drugs.length; drugIndex++) {
    const drug = asRecord(master.drugs[drugIndex], `Drug Master drugs[${drugIndex}]`);
    const identifiers = asRecord(drug.externalIdentifiers, `Drug Master drugs[${drugIndex}].externalIdentifiers`);
    const itemSeq = identifiers.mfdsItemSeq;
    const drugId = drug.drugId;
    if (typeof itemSeq !== "string" || itemSeq.length === 0 || drugId !== `mfds-item-seq:${itemSeq}`) {
      throw new Error(`Drug Master drugs[${drugIndex}] has an invalid drugId mapping.`);
    }
    if (!Array.isArray(drug.easyDrug)) {
      throw new Error(`Drug Master drugs[${drugIndex}].easyDrug must be an array.`);
    }

    for (let rowIndex = 0; rowIndex < drug.easyDrug.length; rowIndex++) {
      sourceRows++;
      const row = asRecord(drug.easyDrug[rowIndex], `Drug Master drugs[${drugIndex}].easyDrug[${rowIndex}]`);
      const attributes = asRecord(row.attributes, `Drug Master drugs[${drugIndex}].easyDrug[${rowIndex}].attributes`);
      const ref = sourceRef(row.sourceRef, `Drug Master drugs[${drugIndex}].easyDrug[${rowIndex}].sourceRef`);
      const sourceText = attributes.efcyQesitm;
      const sourceItemName = attributes.itemName;
      if (sourceItemName !== null && typeof sourceItemName !== "string") {
        throw new Error(`e약은요 ${ref.rawFile} row ${ref.rowInPage} has a non-text itemName.`);
      }
      if (sourceText === null) {
        emptyOrNullEfficacy++;
        continue;
      }
      if (typeof sourceText !== "string") {
        throw new Error(`e약은요 ${ref.rawFile} row ${ref.rowInPage} has a non-text efcyQesitm.`);
      }
      if (sourceText.trim() === "") {
        emptyOrNullEfficacy++;
        continue;
      }
      evidence.push({
        evidenceId: stableEvidenceId(drugId, ref),
        drugId,
        source: "easy-drug",
        sourceText,
        sourceItemName,
        sourceRef: ref,
        reviewStatus: "pending",
        reviewedConcepts: [],
      });
    }
  }

  const generatedAt = new Date().toISOString();
  const worklist = {
    schemaVersion: "1.0.0",
    generatedAt,
    sourceMaster: basename(resolve(masterPath)),
    masterGeneratedAt: master.generatedAt ?? null,
    sourceSnapshots,
    extractionPolicy: {
      sourceField: "easy-drug.attributes.efcyQesitm",
      sourceTextIsCopiedWithoutModification: true,
      phraseSegmentation: false,
      symptomClassification: false,
      safetyOrTreatmentInterpretation: false,
      joinRule: "Use the Drug Master drugId mapping; do not infer relationships from names or efficacy text.",
      reviewStatus: "pending",
    },
    summary: {
      sourceRows,
      evidenceRows: evidence.length,
      emptyOrNullEfficacy,
      uniqueDrugIdsWithEvidence: new Set(evidence.map((row) => row.drugId)).size,
      reviewStatusCounts: { pending: evidence.length },
    },
    evidence,
  };

  await mkdir(resolve(outputPath, ".."), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(worklist, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return { outputPath, worklist };
}

if (require.main === module) {
  const [masterPath, outputPath] = process.argv.slice(2);
  if (!masterPath) {
    process.stderr.write("Usage: node -r ts-node/register efficacy-evidence-worklist.ts <drugMasterJson> [outputJson]\n");
    process.exitCode = 2;
  } else {
    buildEfficacyEvidenceWorklist(masterPath, outputPath)
      .then(({ outputPath: savedPath, worklist }) => {
        process.stdout.write(`Phase 6 efficacy evidence worklist saved: ${savedPath}\n`);
        process.stdout.write(`${JSON.stringify(worklist.summary, null, 2)}\n`);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Unknown Phase 6 evidence worklist error.";
        process.stderr.write(`${message}\n`);
        process.exitCode = 1;
      });
  }
}
