import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  PHASE3_SOURCE_CONFIG,
  Phase3QueryParameters,
  Phase3SourceId,
  requestPhase3Page,
} from "./phase3.raw.client";

const sourceDirectory = __dirname;
const defaultOutputDirectory = resolve(sourceDirectory, "../../../data/raw/phase3");

function defaultDatasetDirectory(sourceId: Phase3SourceId): string {
  return resolve(defaultOutputDirectory, sourceId, `dataset-${timestamp()}`);
}

function timestamp(): string {
  return new Date().toISOString().replaceAll(":", "-");
}

function responseExtension(contentType: string | null): string {
  if (contentType?.toLowerCase().includes("json")) return "json";
  if (contentType?.toLowerCase().includes("xml")) return "xml";
  return "body";
}

export async function collectPhase3Page(
  sourceId: Phase3SourceId,
  pageNo = 1,
  numOfRows = 10,
  outputDirectory = resolve(defaultOutputDirectory, sourceId, `probe-${timestamp()}`),
  queryParameters: Phase3QueryParameters = {},
) {
  if (!Number.isInteger(pageNo) || pageNo < 1) throw new Error("pageNo must be a positive integer.");
  if (!Number.isInteger(numOfRows) || numOfRows < 1) {
    throw new Error("numOfRows must be a positive integer.");
  }

  const source = PHASE3_SOURCE_CONFIG[sourceId];
  const requestedAt = new Date().toISOString();
  const response = await requestPhase3Page(sourceId, pageNo, numOfRows, queryParameters);
  const rawFile = `page-${String(pageNo).padStart(6, "0")}.${responseExtension(response.contentType)}`;
  const rawPath = resolve(outputDirectory, rawFile);
  const metadataPath = resolve(outputDirectory, `page-${String(pageNo).padStart(6, "0")}.metadata.json`);

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(rawPath, response.body, { flag: "wx" });
  await writeFile(
    metadataPath,
    `${JSON.stringify(
      {
        source: sourceId,
        method: "GET",
        endpoint: source.endpoint,
        apiKeyParameterName: source.apiKeyParameter,
        requestedAt,
        pageNo,
        numOfRows,
        queryParameterNames: Object.keys(queryParameters).sort(),
        responseFormat: source.format,
        httpStatus: response.status,
        contentType: response.contentType,
        byteLength: response.body.byteLength,
        rawFile,
      },
      null,
      2,
    )}\n`,
    { encoding: "utf8", flag: "wx" },
  );

  return {
    source: sourceId,
    httpStatus: response.status,
    contentType: response.contentType,
    byteLength: response.body.byteLength,
    rawPath,
    metadataPath,
  };
}

type ParsedJsonPage = {
  totalCount: number;
  itemCount: number;
};

function parseJsonPage(
  raw: unknown,
  sourceId: Phase3SourceId,
  pageNo: number,
  numOfRows: number,
): ParsedJsonPage {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`${sourceId} page ${pageNo} did not contain a JSON object.`);
  }

  const root = raw as Record<string, unknown>;
  const header = root.header;
  const body = root.body;
  if (typeof header !== "object" || header === null || typeof body !== "object" || body === null) {
    throw new Error(`${sourceId} page ${pageNo} did not match the observed JSON envelope.`);
  }

  const headerRecord = header as Record<string, unknown>;
  const bodyRecord = body as Record<string, unknown>;
  const resultCode = headerRecord.resultCode;
  if (resultCode !== "00") {
    const safeCode = typeof resultCode === "string" && /^[A-Za-z0-9_-]{1,32}$/.test(resultCode)
      ? resultCode
      : "withheld";
    throw new Error(`${sourceId} collection stopped on page ${pageNo}: API result code ${safeCode}.`);
  }

  const returnedPageNo = bodyRecord.pageNo;
  const returnedNumOfRows = bodyRecord.numOfRows;
  const totalCount = bodyRecord.totalCount;
  const items = bodyRecord.items;
  if (
    returnedPageNo !== pageNo ||
    returnedNumOfRows !== numOfRows ||
    typeof totalCount !== "number" ||
    !Number.isInteger(totalCount) ||
    totalCount < 0 ||
    !Array.isArray(items)
  ) {
    throw new Error(`${sourceId} collection stopped on page ${pageNo}: pagination or item fields differed from the observed contract.`);
  }
  if (items.length > numOfRows || (totalCount > 0 && items.length === 0)) {
    throw new Error(`${sourceId} collection stopped on page ${pageNo}: unexpected item count.`);
  }

  return { totalCount, itemCount: items.length };
}

export async function collectAllPhase3Pages(
  sourceId: Phase3SourceId,
  numOfRows = 500,
  delayMs = 500,
  outputDirectory = defaultDatasetDirectory(sourceId),
  onProgress?: (progress: { pageNo: number; totalPages: number; downloadedRows: number }) => void,
) {
  if (PHASE3_SOURCE_CONFIG[sourceId].format !== "json") {
    throw new Error(`${sourceId} is not supported by the JSON pagination collector.`);
  }
  if (!Number.isInteger(numOfRows) || numOfRows < 1) throw new Error("numOfRows must be a positive integer.");
  if (!Number.isFinite(delayMs) || delayMs < 0) throw new Error("delayMs must be a non-negative number.");

  let expectedTotalCount: number | null = null;
  let totalPages = 1;
  let downloadedRows = 0;

  for (let pageNo = 1; pageNo <= totalPages; pageNo++) {
    if (pageNo > 1 && delayMs > 0) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, delayMs));
    }

    const result = await collectPhase3Page(sourceId, pageNo, numOfRows, outputDirectory);
    if (result.httpStatus < 200 || result.httpStatus >= 300) {
      throw new Error(`${sourceId} collection stopped on page ${pageNo}: HTTP ${result.httpStatus}.`);
    }

    let parsed: ParsedJsonPage;
    try {
      const raw = JSON.parse((await readFile(result.rawPath)).toString("utf8")) as unknown;
      parsed = parseJsonPage(raw, sourceId, pageNo, numOfRows);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith(`${sourceId} collection stopped`)) throw error;
      throw new Error(`${sourceId} collection stopped on page ${pageNo}: response could not be parsed in the observed JSON shape.`);
    }

    if (expectedTotalCount !== null && parsed.totalCount !== expectedTotalCount) {
      throw new Error(`${sourceId} collection stopped on page ${pageNo}: totalCount changed during collection.`);
    }
    expectedTotalCount = parsed.totalCount;
    totalPages = Math.max(1, Math.ceil(expectedTotalCount / numOfRows));
    downloadedRows += parsed.itemCount;
    onProgress?.({ pageNo, totalPages, downloadedRows });
  }

  const totalCount = expectedTotalCount ?? 0;
  const complete = downloadedRows === totalCount;
  if (!complete) {
    throw new Error(`${sourceId} collection ended with ${downloadedRows} rows; expected ${totalCount}.`);
  }

  const manifestPath = resolve(outputDirectory, "snapshot-manifest.json");
  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        source: sourceId,
        endpoint: PHASE3_SOURCE_CONFIG[sourceId].endpoint,
        responseFormat: PHASE3_SOURCE_CONFIG[sourceId].format,
        pageSize: numOfRows,
        totalCount,
        pagesDownloaded: totalPages,
        downloadedRows,
        complete,
        capturedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    { encoding: "utf8", flag: "wx" },
  );

  return { source: sourceId, outputDirectory, totalCount, pagesDownloaded: totalPages, downloadedRows, complete, manifestPath };
}

function isPhase3Source(value: string): value is Phase3SourceId {
  return Object.hasOwn(PHASE3_SOURCE_CONFIG, value);
}

function parseQueryParameters(args: string[]): Phase3QueryParameters {
  const parameters: Phase3QueryParameters = {};
  for (const arg of args) {
    const delimiterIndex = arg.indexOf("=");
    if (delimiterIndex < 1) throw new Error("Filters must use the form name=value.");
    const name = arg.slice(0, delimiterIndex);
    const value = arg.slice(delimiterIndex + 1);
    if (Object.hasOwn(parameters, name)) throw new Error(`Duplicate filter name: ${name}.`);
    parameters[name] = value;
  }
  return parameters;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const isAllPages = args[0] === "--all";
  const sourceIdArg = isAllPages ? args[1] : args[0];
  const numOfRowsArg = isAllPages ? args[2] : args[1];
  const pageNoArg = isAllPages ? undefined : args[2];
  const delayMsArg = isAllPages ? args[3] : undefined;
  const outputDirectoryArg = isAllPages ? args[4] : undefined;
  const queryParameterArgs = isAllPages ? [] : args.slice(3);
  if (!sourceIdArg || !isPhase3Source(sourceIdArg)) {
    process.stderr.write(`Usage: node -r ts-node/register phase3.raw.collector.ts [--all] <${Object.keys(PHASE3_SOURCE_CONFIG).join("|")}> [numOfRows=${isAllPages ? 500 : 10}] [${isAllPages ? "delayMs=500" : "pageNo=1"}] [outputDirectory] [name=value ...]\n`);
    process.exitCode = 2;
  } else if (isAllPages) {
    const numOfRows = numOfRowsArg === undefined ? 500 : Number(numOfRowsArg);
    const delayMs = delayMsArg === undefined ? 500 : Number(delayMsArg);
    const outputDirectory = outputDirectoryArg || defaultDatasetDirectory(sourceIdArg);
    process.stdout.write(`Raw dataset directory: ${outputDirectory}\n`);
    collectAllPhase3Pages(sourceIdArg, numOfRows, delayMs, outputDirectory, (progress) => {
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
    const numOfRows = numOfRowsArg === undefined ? 10 : Number(numOfRowsArg);
    const pageNo = pageNoArg === undefined ? 1 : Number(pageNoArg);
    let queryParameters: Phase3QueryParameters | null = null;
    try {
      queryParameters = parseQueryParameters(queryParameterArgs);
    } catch (error) {
      process.stderr.write(`${error instanceof Error ? error.message : "Invalid query parameters."}\n`);
      process.exitCode = 2;
    }
    if (queryParameters) {
      collectPhase3Page(sourceIdArg, pageNo, numOfRows, undefined, queryParameters)
        .then((result) => {
          process.stdout.write(
            `Captured ${result.source} page ${pageNo}: HTTP ${result.httpStatus}, bytes=${result.byteLength}, raw=${result.rawPath}\n`,
          );
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "Unknown collection error.";
          process.stderr.write(`${message}\n`);
          process.exitCode = 1;
        });
    }
  }
}
