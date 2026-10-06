import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { EASY_DRUG_ENDPOINT, requestEasyDrugPage } from "./easy-drug.client";
import { validateEasyDrugResponse } from "./easy-drug.validator";

const sourceDirectory = __dirname;
const defaultOutputDirectory = resolve(sourceDirectory, "../../../data/raw/easy-drug");

function defaultSnapshotDirectory(): string {
  const snapshotId = new Date().toISOString().replaceAll(":", "-");
  return resolve(defaultOutputDirectory, `snapshot-${snapshotId}`);
}

function responseExtension(contentType: string | null): string {
  if (contentType?.toLowerCase().includes("json")) return "json";
  if (contentType?.toLowerCase().includes("xml")) return "xml";
  return "body";
}

export async function collectPage(
  pageNo = 1,
  numOfRows = 10,
  outputDirectory = defaultOutputDirectory,
) {
  if (!Number.isInteger(pageNo) || pageNo < 1) throw new Error("pageNo must be a positive integer.");
  if (!Number.isInteger(numOfRows) || numOfRows < 1) throw new Error("numOfRows must be a positive integer.");
  const request = { pageNo, numOfRows, type: "json" as const };
  const pageLabel = String(request.pageNo).padStart(6, "0");
  await mkdir(outputDirectory, { recursive: true });
  const existingFiles = await readdir(outputDirectory);
  if (existingFiles.some((filename) => filename.startsWith(`page-${pageLabel}.`))) {
    throw new Error(`Raw response for page ${pageNo} already exists in the selected directory.`);
  }

  const requestedAt = new Date().toISOString();
  const response = await requestEasyDrugPage(request);
  const rawFile = `page-${pageLabel}.${responseExtension(response.contentType)}`;
  const rawPath = resolve(outputDirectory, rawFile);
  const metadataPath = resolve(outputDirectory, `page-${pageLabel}.metadata.json`);

  await writeFile(rawPath, response.body, { flag: "wx" });
  await writeFile(
    metadataPath,
    `${JSON.stringify(
      {
        source: "easy-drug",
        method: "GET",
        endpoint: EASY_DRUG_ENDPOINT,
        requestedAt,
        pageNo: request.pageNo,
        numOfRows: request.numOfRows,
        type: request.type,
        httpStatus: response.status,
        contentType: response.contentType,
        rawFile,
      },
      null,
      2,
    )}\n`,
    { encoding: "utf8", flag: "wx" },
  );

  return {
    httpStatus: response.status,
    contentType: response.contentType,
    byteLength: response.body.byteLength,
    rawPath,
    metadataPath,
  };
}

export function collectFirstPage(outputDirectory = defaultOutputDirectory) {
  return collectPage(1, 10, outputDirectory);
}

export async function collectAllPages(
  numOfRows = 100,
  delayMs = 1_000,
  outputDirectory = defaultSnapshotDirectory(),
  onProgress?: (progress: { pageNo: number; totalPages: number; downloadedRows: number }) => void,
) {
  if (!Number.isInteger(numOfRows) || numOfRows < 1) throw new Error("numOfRows must be a positive integer.");
  if (!Number.isFinite(delayMs) || delayMs < 0) throw new Error("delayMs must be a non-negative number.");

  let expectedTotalCount: number | null = null;
  let totalPages = 1;
  let downloadedRows = 0;
  let pageNo = 1;
  const itemSeqs: string[] = [];

  while (pageNo <= totalPages) {
    if (pageNo > 1 && delayMs > 0) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, delayMs));
    }

    const result = await collectPage(pageNo, numOfRows, outputDirectory);
    if (result.httpStatus < 200 || result.httpStatus >= 300) {
      throw new Error(`e약은요 collection stopped on page ${pageNo}: HTTP ${result.httpStatus}.`);
    }

    let response: ReturnType<typeof validateEasyDrugResponse>;
    try {
      response = validateEasyDrugResponse(JSON.parse((await readFile(result.rawPath)).toString("utf8")) as unknown);
    } catch {
      throw new Error(`e약은요 collection stopped on page ${pageNo}: response was not valid JSON in the observed shape.`);
    }
    if (response.header.resultCode !== "00") {
      throw new Error(`e약은요 collection stopped on page ${pageNo}: API result code ${response.header.resultCode}.`);
    }
    if (response.body.pageNo !== pageNo || response.body.numOfRows !== numOfRows) {
      throw new Error(`e약은요 collection stopped on page ${pageNo}: pagination values differed from the request.`);
    }
    if (response.body.items.length > numOfRows || (response.body.totalCount > 0 && response.body.items.length === 0)) {
      throw new Error(`e약은요 collection stopped on page ${pageNo}: unexpected item count.`);
    }
    if (expectedTotalCount !== null && response.body.totalCount !== expectedTotalCount) {
      throw new Error(`e약은요 collection stopped on page ${pageNo}: totalCount changed during collection.`);
    }

    expectedTotalCount = response.body.totalCount;
    totalPages = Math.max(1, Math.ceil(expectedTotalCount / numOfRows));
    downloadedRows += response.body.items.length;
    itemSeqs.push(...response.body.items.map((item) => item.itemSeq).filter((value): value is string => typeof value === "string"));
    onProgress?.({ pageNo, totalPages, downloadedRows });
    pageNo++;
  }

  const uniqueItemSeq = new Set(itemSeqs).size;
  return {
    outputDirectory,
    totalCount: expectedTotalCount ?? 0,
    pagesDownloaded: totalPages,
    downloadedRows,
    uniqueItemSeq,
    duplicates: itemSeqs.length - uniqueItemSeq,
    complete: downloadedRows === (expectedTotalCount ?? 0),
  };
}

if (require.main === module) {
  if (process.argv[2] === "--all") {
    const numOfRows = process.argv[3] === undefined ? 100 : Number(process.argv[3]);
    const delayMs = process.argv[4] === undefined ? 1_000 : Number(process.argv[4]);
    const outputDirectory = process.argv[5] || defaultSnapshotDirectory();
    process.stdout.write(`Raw snapshot directory: ${outputDirectory}\n`);
    collectAllPages(numOfRows, delayMs, outputDirectory, (progress) => {
      if (progress.pageNo % 5 === 0 || progress.pageNo === progress.totalPages) {
        process.stdout.write(`Fetched page ${progress.pageNo}/${progress.totalPages}; rows=${progress.downloadedRows}\n`);
      }
    })
      .then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Unknown collection error.";
        process.stderr.write(`${message}\n`);
        process.exitCode = 1;
      });
  } else {
    const pageNo = process.argv[2] === undefined ? 1 : Number(process.argv[2]);
    const numOfRows = process.argv[3] === undefined ? 10 : Number(process.argv[3]);
    const outputDirectory = process.argv[4] || defaultOutputDirectory;
    collectPage(pageNo, numOfRows, outputDirectory)
      .then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Unknown collection error.";
        process.stderr.write(`${message}\n`);
        process.exitCode = 1;
      });
  }
}
