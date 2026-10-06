import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

type JsonRecord = Record<string, unknown>;
type SourceRef = {
  source: "easy-drug";
  snapshot: string;
  rawFile: string;
  rowInPage: number;
};
type Span = {
  spanId: string;
  startUtf16: number;
  endUtf16Exclusive: number;
  text: string;
  gapAfter: string;
  reviewStatus: "pending";
  reviewedConcepts: [];
};

const sourceDirectory = __dirname;
const defaultOutputDirectory = resolve(sourceDirectory, "../../../data/normalized/phase6-efficacy");
const boundaryPattern = /\r\n|[\r\n]|[,，;；·ㆍ•]|[.!?。！？](?=\s|$)/gu;

function asRecord(value: unknown, label: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return value as JsonRecord;
}

function validateSourceRef(value: unknown, label: string): SourceRef {
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

function stableSpanId(evidenceId: string, startUtf16: number, endUtf16Exclusive: number): string {
  const identity = [evidenceId, startUtf16, endUtf16Exclusive].join("\n");
  return `sha256:${createHash("sha256").update(identity, "utf8").digest("hex")}`;
}

function trimmedBounds(text: string, start: number, end: number): { start: number; end: number } | null {
  while (start < end && /\s/u.test(text[start])) start++;
  while (end > start && /\s/u.test(text[end - 1])) end--;
  return start < end ? { start, end } : null;
}

function splitSourceText(sourceText: string) {
  const ranges: Array<{ start: number; end: number }> = [];
  const delimiterCounts: Record<string, number> = {};
  let cursor = 0;

  for (const match of sourceText.matchAll(boundaryPattern)) {
    const delimiter = match[0];
    const delimiterStart = match.index;
    const bounds = trimmedBounds(sourceText, cursor, delimiterStart);
    if (bounds) ranges.push(bounds);
    delimiterCounts[delimiter] = (delimiterCounts[delimiter] ?? 0) + 1;
    cursor = delimiterStart + delimiter.length;
  }

  const tailBounds = trimmedBounds(sourceText, cursor, sourceText.length);
  if (tailBounds) ranges.push(tailBounds);

  const spans = ranges.map((range, index) => {
    const nextStart = ranges[index + 1]?.start ?? sourceText.length;
    return {
      startUtf16: range.start,
      endUtf16Exclusive: range.end,
      text: sourceText.slice(range.start, range.end),
      gapAfter: sourceText.slice(range.end, nextStart),
    };
  });

  return { spans, delimiterCounts };
}

export async function buildEfficacyTextSpans(
  worklistPath: string,
  outputPath = resolve(
    defaultOutputDirectory,
    `efficacy-text-spans-${new Date().toISOString().replaceAll(":", "-")}.json`,
  ),
) {
  const worklist = asRecord(JSON.parse((await readFile(resolve(worklistPath))).toString("utf8")) as unknown, "Efficacy evidence worklist");
  if (worklist.schemaVersion !== "1.0.0" || !Array.isArray(worklist.evidence) || worklist.evidence.length === 0) {
    throw new Error("Input must be a non-empty efficacy evidence worklist v1 document.");
  }

  const evidenceIds = new Set<string>();
  const aggregateDelimiterCounts: Record<string, number> = {};
  const evidence = worklist.evidence.map((value, index) => {
    const row = asRecord(value, `worklist.evidence[${index}]`);
    const evidenceId = row.evidenceId;
    const drugId = row.drugId;
    const sourceText = row.sourceText;
    const sourceItemName = row.sourceItemName;
    if (typeof evidenceId !== "string" || evidenceId.length === 0 || evidenceIds.has(evidenceId)) {
      throw new Error(`worklist.evidence[${index}] has a missing or duplicate evidenceId.`);
    }
    evidenceIds.add(evidenceId);
    if (typeof drugId !== "string" || drugId.length === 0) {
      throw new Error(`worklist.evidence[${index}] has an invalid drugId.`);
    }
    if (typeof sourceText !== "string" || sourceText.trim() === "") {
      throw new Error(`worklist.evidence[${index}] has empty or non-text sourceText.`);
    }
    if (sourceItemName !== null && typeof sourceItemName !== "string") {
      throw new Error(`worklist.evidence[${index}] has a non-text sourceItemName.`);
    }
    if (row.source !== "easy-drug" || row.reviewStatus !== "pending" ||
      !Array.isArray(row.reviewedConcepts) || row.reviewedConcepts.length !== 0) {
      throw new Error(`worklist.evidence[${index}] must be an unreviewed e약은요 evidence row.`);
    }
    const sourceRef = validateSourceRef(row.sourceRef, `worklist.evidence[${index}].sourceRef`);
    const split = splitSourceText(sourceText);

    for (const [delimiter, count] of Object.entries(split.delimiterCounts)) {
      aggregateDelimiterCounts[delimiter] = (aggregateDelimiterCounts[delimiter] ?? 0) + count;
    }

    const spans: Span[] = split.spans.map((span) => ({
      spanId: stableSpanId(evidenceId, span.startUtf16, span.endUtf16Exclusive),
      startUtf16: span.startUtf16,
      endUtf16Exclusive: span.endUtf16Exclusive,
      text: span.text,
      gapAfter: span.gapAfter,
      reviewStatus: "pending",
      reviewedConcepts: [],
    }));

    return {
      evidenceId,
      drugId,
      source: "easy-drug" as const,
      sourceItemName: sourceItemName as string | null,
      sourceRef,
      sourceText,
      reviewStatus: "pending" as const,
      spans,
    };
  });

  const totalSpans = evidence.reduce((total, row) => total + row.spans.length, 0);
  const document = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    sourceWorklist: basename(resolve(worklistPath)),
    sourceWorklistGeneratedAt: worklist.generatedAt ?? null,
    extractionPolicy: {
      sourceField: "easy-drug.attributes.efcyQesitm",
      sourceTextCopiedWithoutModification: true,
      offsetUnit: "UTF-16 code units, half-open [startUtf16, endUtf16Exclusive)",
      splitBoundaries: ["line breaks", "commas", "semicolon", "middle dots", "bullets", "sentence punctuation followed by whitespace or end"],
      splitDecisionIsLexicalOnly: true,
      symptomOrConditionClassification: false,
      safetyOrTreatmentInterpretation: false,
      reviewStatus: "pending",
    },
    summary: {
      evidenceRows: evidence.length,
      spanRows: totalSpans,
      evidenceWithNoNonWhitespaceSpan: evidence.filter((row) => row.spans.length === 0).length,
      reviewStatusCounts: { pending: totalSpans },
      delimiterCounts: aggregateDelimiterCounts,
    },
    evidence,
  };

  await mkdir(resolve(outputPath, ".."), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return { outputPath, document };
}

if (require.main === module) {
  const [worklistPath, outputPath] = process.argv.slice(2);
  if (!worklistPath) {
    process.stderr.write("Usage: node -r ts-node/register efficacy-text-spans.ts <efficacyWorklistJson> [outputJson]\n");
    process.exitCode = 2;
  } else {
    buildEfficacyTextSpans(worklistPath, outputPath)
      .then(({ outputPath: savedPath, document }) => {
        process.stdout.write(`Phase 6 efficacy text spans saved: ${savedPath}\n`);
        process.stdout.write(`${JSON.stringify(document.summary, null, 2)}\n`);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Unknown Phase 6 text span error.";
        process.stderr.write(`${message}\n`);
        process.exitCode = 1;
      });
  }
}
