import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

type JsonRecord = Record<string, unknown>;
type SourceValue = { attributes: JsonRecord; sourceRef: JsonRecord };
type DrugMasterRecord = {
  drugId: string;
  externalIdentifiers: { mfdsItemSeq: string };
  productPermit: SourceValue;
  easyDrug: SourceValue[];
  pillIdentification: SourceValue[];
};

const sourceDirectory = __dirname;
const defaultReportDirectory = resolve(sourceDirectory, "../../../data/reports/phase5");

function asRecord(value: unknown, description: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${description} must be a JSON object.`);
  }
  return value as JsonRecord;
}

function asSourceValues(value: unknown, description: string): SourceValue[] {
  if (!Array.isArray(value)) throw new Error(`${description} must be an array.`);
  return value.map((entry, index) => {
    const row = asRecord(entry, `${description}[${index}]`);
    return {
      attributes: asRecord(row.attributes, `${description}[${index}].attributes`),
      sourceRef: asRecord(row.sourceRef, `${description}[${index}].sourceRef`),
    };
  });
}

function fieldCoverage(rows: JsonRecord[], fields: string[]) {
  return Object.fromEntries(fields.map((field) => {
    let present = 0;
    let nullValues = 0;
    let blankStrings = 0;
    let nonEmptyStrings = 0;
    let invalidTypes = 0;
    for (const row of rows) {
      if (!Object.hasOwn(row, field)) continue;
      present++;
      if (row[field] === null) nullValues++;
      else if (typeof row[field] !== "string") invalidTypes++;
      else if (row[field].trim() === "") blankStrings++;
      else nonEmptyStrings++;
    }
    return [field, {
      rows: rows.length,
      present,
      missing: rows.length - present,
      nullValues,
      blankStrings,
      nonEmptyStrings,
      invalidTypes,
    }];
  }));
}

function pairwiseExactNameComparison(
  sample: DrugMasterRecord[],
  masterField: string,
  sourceField: string,
  sourceKey: "easyDrug" | "pillIdentification",
) {
  let comparablePairs = 0;
  let exactMatches = 0;
  let differentValues = 0;
  let whitespaceRemovalEquivalentDifferences = 0;
  let differentAfterWhitespaceRemoval = 0;
  let masterOnly = 0;
  let sourceOnly = 0;
  const whitespaceDifferenceExamples: Array<Record<string, unknown>> = [];
  const otherDifferenceExamples: Array<Record<string, unknown>> = [];
  for (const drug of sample) {
    const masterValue = drug.productPermit.attributes[masterField];
    for (const source of drug[sourceKey]) {
      const sourceValue = source.attributes[sourceField];
      if (typeof masterValue !== "string" || typeof sourceValue !== "string") {
        if (typeof masterValue === "string") masterOnly++;
        else if (typeof sourceValue === "string") sourceOnly++;
        continue;
      }
      comparablePairs++;
      if (masterValue === sourceValue) exactMatches++;
      else {
        differentValues++;
        const removeWhitespace = (value: string) => value.replace(/\s/g, "");
        const example = {
          drugId: drug.drugId,
          productPermit: { value: masterValue, sourceRef: drug.productPermit.sourceRef },
          comparedSource: { value: sourceValue, sourceRef: source.sourceRef },
        };
        if (removeWhitespace(masterValue) === removeWhitespace(sourceValue)) {
          whitespaceRemovalEquivalentDifferences++;
          if (whitespaceDifferenceExamples.length < 20) whitespaceDifferenceExamples.push(example);
        } else {
          differentAfterWhitespaceRemoval++;
          if (otherDifferenceExamples.length < 20) otherDifferenceExamples.push(example);
        }
      }
    }
  }
  return {
    comparablePairs,
    exactMatches,
    differentValues,
    whitespaceRemovalEquivalentDifferences,
    differentAfterWhitespaceRemoval,
    masterOnly,
    sourceOnly,
    whitespaceDifferenceExamples,
    otherDifferenceExamples,
  };
}

export async function validateDrugMasterSample(
  masterPath: string,
  sampleSize = 1000,
  reportPath = resolve(defaultReportDirectory, `drug-master-sample-${new Date().toISOString().replaceAll(":", "-")}.json`),
) {
  if (!Number.isInteger(sampleSize) || sampleSize < 1 || sampleSize > 1000) {
    throw new Error("sampleSize must be an integer from 1 through 1000.");
  }
  const master = asRecord(JSON.parse((await readFile(resolve(masterPath))).toString("utf8")) as unknown, "Drug Master");
  if (master.schemaVersion !== "1.0.0" || !Array.isArray(master.drugs) || master.drugs.length === 0) {
    throw new Error("Input must be a non-empty Drug Master v1 document.");
  }

  const drugs: DrugMasterRecord[] = master.drugs.map((value, index) => {
    const row = asRecord(value, `Drug Master drugs[${index}]`);
    const identifiers = asRecord(row.externalIdentifiers, `Drug Master drugs[${index}].externalIdentifiers`);
    const permit = asRecord(row.productPermit, `Drug Master drugs[${index}].productPermit`);
    const normalized: DrugMasterRecord = {
      drugId: typeof row.drugId === "string" ? row.drugId : "",
      externalIdentifiers: { mfdsItemSeq: typeof identifiers.mfdsItemSeq === "string" ? identifiers.mfdsItemSeq : "" },
      productPermit: {
        attributes: asRecord(permit.attributes, `Drug Master drugs[${index}].productPermit.attributes`),
        sourceRef: asRecord(permit.sourceRef, `Drug Master drugs[${index}].productPermit.sourceRef`),
      },
      easyDrug: asSourceValues(row.easyDrug, `Drug Master drugs[${index}].easyDrug`),
      pillIdentification: asSourceValues(row.pillIdentification, `Drug Master drugs[${index}].pillIdentification`),
    };
    if (
      !normalized.externalIdentifiers.mfdsItemSeq ||
      normalized.drugId !== `mfds-item-seq:${normalized.externalIdentifiers.mfdsItemSeq}`
    ) {
      throw new Error(`Drug Master drugs[${index}] has an invalid internal/external identifier mapping.`);
    }
    return normalized;
  });

  const sorted = [...drugs].sort((left, right) =>
    left.externalIdentifiers.mfdsItemSeq.localeCompare(right.externalIdentifiers.mfdsItemSeq),
  );
  if (new Set(sorted.map((drug) => drug.externalIdentifiers.mfdsItemSeq)).size !== sorted.length) {
    throw new Error("Drug Master contains duplicate product-permit ITEM_SEQ identifiers.");
  }
  if (sampleSize > sorted.length) throw new Error(`Requested ${sampleSize} products, but only ${sorted.length} are available.`);

  const sampleIndexes = sampleSize === 1
    ? [0]
    : Array.from({ length: sampleSize }, (_, index) => Math.floor(index * (sorted.length - 1) / (sampleSize - 1)));
  const sample = sampleIndexes.map((index) => sorted[index]);
  const sampledIds = sample.map((drug) => drug.externalIdentifiers.mfdsItemSeq);
  if (new Set(sampledIds).size !== sampleSize) throw new Error("Deterministic sample selection returned duplicate product identifiers.");

  const easyDrugRows = sample.flatMap((drug) => drug.easyDrug);
  const pillRows = sample.flatMap((drug) => drug.pillIdentification);
  const sourceSnapshots = asRecord(master.sources, "Drug Master sources");
  const generatedAt = new Date().toISOString();
  const report = {
    reportVersion: "1.0.0",
    generatedAt,
    sourceMaster: basename(resolve(masterPath)),
    masterGeneratedAt: master.generatedAt,
    sourceSnapshots,
    sampleSelection: {
      population: sorted.length,
      sampleSize,
      algorithm: sampleSize === 1
        ? "select the first ID after lexical sort"
        : "sort exact mfdsItemSeq values lexically; select floor(i * (population - 1) / (sampleSize - 1)) for i=0..sampleSize-1",
      sampledIdsSha256: createHash("sha256").update(sampledIds.join("\n"), "utf8").digest("hex"),
      sampledIds,
    },
    sampleCounts: {
      products: sample.length,
      productsWithEasyDrug: sample.filter((drug) => drug.easyDrug.length > 0).length,
      easyDrugRows: easyDrugRows.length,
      productsWithPillIdentification: sample.filter((drug) => drug.pillIdentification.length > 0).length,
      pillIdentificationRows: pillRows.length,
      productsWithDuplicateEasyDrugRows: sample.filter((drug) => drug.easyDrug.length > 1).length,
      productsWithDuplicatePillRows: sample.filter((drug) => drug.pillIdentification.length > 1).length,
    },
    fieldCoverage: {
      productPermit: fieldCoverage(sample.map((drug) => drug.productPermit.attributes), [
        "ITEM_NAME", "ENTP_NAME", "ITEM_INGR_NAME", "ITEM_INGR_CNT", "ITEM_PERMIT_DATE",
      ]),
      easyDrug: fieldCoverage(easyDrugRows.map((row) => row.attributes), [
        "itemName", "entpName", "efcyQesitm", "useMethodQesitm", "atpnWarnQesitm", "atpnQesitm",
        "intrcQesitm", "seQesitm", "depositMethodQesitm", "openDe", "updateDe",
      ]),
      pillIdentification: fieldCoverage(pillRows.map((row) => row.attributes), [
        "ITEM_NAME", "ENTP_NAME", "CHART", "DRUG_SHAPE", "COLOR_CLASS1", "COLOR_CLASS2", "PRINT_FRONT",
        "PRINT_BACK", "LINE_FRONT", "LINE_BACK", "LENG_LONG", "LENG_SHORT", "THICK", "FORM_CODE_NAME",
        "CLASS_NO", "CLASS_NAME", "ETC_OTC_NAME", "STD_CD",
      ]),
    },
    exactNameComparisons: {
      productPermitVsEasyDrug: {
        ITEM_NAME_vs_itemName: pairwiseExactNameComparison(sample, "ITEM_NAME", "itemName", "easyDrug"),
        ENTP_NAME_vs_entpName: pairwiseExactNameComparison(sample, "ENTP_NAME", "entpName", "easyDrug"),
      },
      productPermitVsPillIdentification: {
        ITEM_NAME_vs_ITEM_NAME: pairwiseExactNameComparison(sample, "ITEM_NAME", "ITEM_NAME", "pillIdentification"),
        ENTP_NAME_vs_ENTP_NAME: pairwiseExactNameComparison(sample, "ENTP_NAME", "ENTP_NAME", "pillIdentification"),
      },
      interpretation: "Literal string comparison drives the exact counts. A second diagnostic checks whether removing whitespace makes values equal; neither diagnostic alters stored source values or decides source authority.",
    },
    limitations: [
      "The lexical systematic sample is reproducible but is not a random sample and does not estimate population-wide quality.",
      "This report does not resolve cross-snapshot changes, HIRA/DUR coverage, image rights, or human review requirements.",
      "No safety, suitability, or recommendation conclusion is produced.",
    ],
  };

  await mkdir(resolve(reportPath, ".."), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return { reportPath, report };
}

if (require.main === module) {
  const [masterPath, sampleSizeArgument, reportPath] = process.argv.slice(2);
  if (!masterPath) {
    process.stderr.write("Usage: node -r ts-node/register sample-validation.ts <drugMasterJson> [sampleSize=1000] [reportJson]\n");
    process.exitCode = 2;
  } else {
    const sampleSize = sampleSizeArgument === undefined ? 1000 : Number(sampleSizeArgument);
    validateDrugMasterSample(masterPath, sampleSize, reportPath)
      .then(({ reportPath: savedPath, report }) => {
        process.stdout.write(`Phase 5 sample report saved: ${savedPath}\n`);
        process.stdout.write(`${JSON.stringify({ sampleCounts: report.sampleCounts, exactNameComparisons: report.exactNameComparisons }, null, 2)}\n`);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Unknown Phase 5 validation error.";
        process.stderr.write(`${message}\n`);
        process.exitCode = 1;
      });
  }
}
