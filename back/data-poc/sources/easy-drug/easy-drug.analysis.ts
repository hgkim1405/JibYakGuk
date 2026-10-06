import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { EASY_DRUG_ENDPOINT } from "./easy-drug.client";
import { calculateEasyDrugCoverage } from "./easy-drug.coverage";
import { normalizeEasyDrugItems } from "./easy-drug.normalizer";
import { getUndocumentedItemFields, validateEasyDrugResponse } from "./easy-drug.validator";

const sourceDirectory = __dirname;
const defaultRawPath = resolve(sourceDirectory, "../../../data/raw/easy-drug/page-000001.json");
const defaultReportPath = resolve(sourceDirectory, "../../../data/reports/easy-drug/page-000001-analysis.json");
const defaultRawDirectory = resolve(sourceDirectory, "../../../data/raw/easy-drug");
const defaultReportDirectory = resolve(sourceDirectory, "../../../data/reports/easy-drug");

type EasyDrugRequestMetadata = {
  source: "easy-drug";
  pageNo: number;
  numOfRows: number;
  rawFile: string;
  requestedAt: string;
  httpStatus: number;
  contentType: string;
  [field: string]: unknown;
};

function parseRequestMetadata(
  value: unknown,
  filename: string,
  responsePageNo: number,
  responseNumOfRows: number,
): EasyDrugRequestMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid request metadata for ${filename}.`);
  }
  const filenamePage = /^page-(\d{6})\.json$/.exec(filename);
  const metadata = value as Record<string, unknown>;
  if (
    !filenamePage ||
    Number(filenamePage[1]) !== responsePageNo ||
    metadata.source !== "easy-drug" ||
    metadata.pageNo !== responsePageNo ||
    metadata.numOfRows !== responseNumOfRows ||
    metadata.rawFile !== filename ||
    typeof metadata.requestedAt !== "string" ||
    typeof metadata.httpStatus !== "number" ||
    typeof metadata.contentType !== "string"
  ) {
    throw new Error(`Request metadata does not match ${filename}.`);
  }
  return metadata as EasyDrugRequestMetadata;
}

function summarizeFields(items: Array<Record<string, unknown>>) {
  const keys = [...new Set(items.flatMap((item) => Object.keys(item)))].sort();
  const stats = Object.fromEntries(
    keys.map((key) => {
      let missing = 0;
      let nullValues = 0;
      let emptyStrings = 0;
      let nonEmptyStrings = 0;
      let otherValues = 0;
      for (const item of items) {
        if (!Object.hasOwn(item, key)) {
          missing++;
        } else if (item[key] === null) {
          nullValues++;
        } else if (typeof item[key] === "string") {
          if ((item[key] as string).trim() === "") emptyStrings++;
          else nonEmptyStrings++;
        } else {
          otherValues++;
        }
      }
      return [key, { missing, null: nullValues, emptyString: emptyStrings, nonEmptyString: nonEmptyStrings, other: otherValues }];
    }),
  );
  return { keys, stats };
}

export async function analyzeEasyDrugPage(
  rawPath = defaultRawPath,
  reportPath = defaultReportPath,
) {
  const rawBytes = await readFile(rawPath);
  const parsed: unknown = JSON.parse(rawBytes.toString("utf8"));
  const response = validateEasyDrugResponse(parsed);
  const normalizedItems = normalizeEasyDrugItems(response.body.items);
  const fieldSummary = summarizeFields(response.body.items);
  const undocumentedFields = [...new Set(response.body.items.flatMap(getUndocumentedItemFields))].sort();
  const metadataPath = resolve(dirname(rawPath), `${basename(rawPath, ".json")}.metadata.json`);
  const requestMetadata = parseRequestMetadata(
    JSON.parse((await readFile(metadataPath)).toString("utf8")) as unknown,
    basename(rawPath),
    response.body.pageNo,
    response.body.numOfRows,
  );

  const report = {
    analyzedAt: new Date().toISOString(),
    rawFile: basename(rawPath),
    requestMetadata,
    response: {
      envelopeKeys: Object.keys(response).sort(),
      header: response.header,
      pageNo: response.body.pageNo,
      numOfRows: response.body.numOfRows,
      totalCount: response.body.totalCount,
      itemsLength: response.body.items.length,
      itemFieldKeys: fieldSummary.keys,
      itemFieldStats: fieldSummary.stats,
      undocumentedItemFields: undocumentedFields,
    },
    normalizedRows: normalizedItems.length,
    coverage: calculateEasyDrugCoverage(response.body.items, response.body.totalCount),
  };

  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return { reportPath, report };
}

export async function analyzeEasyDrugDirectory(
  rawDirectory: string,
  reportPath = resolve(defaultReportDirectory, `${basename(rawDirectory)}-analysis.json`),
) {
  const filenames = (await readdir(rawDirectory))
    .filter((filename) => /^page-\d{6}\.json$/.test(filename))
    .sort();
  if (filenames.length === 0) throw new Error("No page-*.json raw responses were found.");

  const pages = [];
  for (const filename of filenames) {
    const rawPath = resolve(rawDirectory, filename);
    const page = validateEasyDrugResponse(JSON.parse((await readFile(rawPath)).toString("utf8")) as unknown);
    if (page.header.resultCode !== "00") {
      throw new Error(`Cannot analyze page ${page.body.pageNo}: API result code ${page.header.resultCode}.`);
    }
    const metadataPath = resolve(rawDirectory, `${basename(filename, ".json")}.metadata.json`);
    const metadata = parseRequestMetadata(
      JSON.parse((await readFile(metadataPath)).toString("utf8")) as unknown,
      filename,
      page.body.pageNo,
      page.body.numOfRows,
    );
    if (metadata.httpStatus < 200 || metadata.httpStatus >= 300) {
      throw new Error(`Cannot analyze page ${page.body.pageNo}: HTTP status was not successful.`);
    }
    pages.push({ filename, response: page, metadata });
  }

  const firstResponse = pages[0].response;
  const totalCountValues = [...new Set(pages.map(({ response }) => response.body.totalCount))];
  const pageSizeValues = [...new Set(pages.map(({ response }) => response.body.numOfRows))];
  const pageNos = pages.map(({ response }) => response.body.pageNo).sort((a, b) => a - b);
  const expectedPages = Math.max(1, Math.ceil(firstResponse.body.totalCount / firstResponse.body.numOfRows));
  const missingPages = Array.from({ length: expectedPages }, (_, index) => index + 1).filter((pageNo) => !pageNos.includes(pageNo));
  const items = pages.flatMap(({ response }) => response.body.items);
  const normalizedItems = normalizeEasyDrugItems(items);
  const fieldSummary = summarizeFields(items);
  const undocumentedFields = [...new Set(items.flatMap(getUndocumentedItemFields))].sort();
  const complete =
    pages.length === expectedPages &&
    missingPages.length === 0 &&
    items.length === firstResponse.body.totalCount &&
    totalCountValues.length === 1 &&
    pageSizeValues.length === 1;
  const requestTimes = pages.map(({ metadata }) => String(metadata.requestedAt)).sort();
  const snapshotManifestPath = resolve(rawDirectory, "snapshot-manifest.json");
  const snapshotManifest = {
    source: "easy-drug",
    method: "GET",
    endpoint: EASY_DRUG_ENDPOINT,
    authenticationParameterName: "ServiceKey",
    credentialValueStored: false,
    requestParameterNames: ["ServiceKey", "pageNo", "numOfRows", "type"],
    requestParameters: {
      pageNos: [Math.min(...pageNos), Math.max(...pageNos)],
      numOfRows: pageSizeValues,
      type: "json",
    },
    requestedAtRange: { first: requestTimes[0] ?? null, last: requestTimes.at(-1) ?? null },
    pagesDownloaded: pages.length,
    expectedPages,
    httpStatuses: [...new Set(pages.map(({ metadata }) => metadata.httpStatus))],
    contentTypes: [...new Set(pages.map(({ metadata }) => metadata.contentType))],
    resultCodes: [...new Set(pages.map(({ response }) => response.header.resultCode))],
    totalCountValues,
    downloadedRows: items.length,
    rawFiles: pages.map(({ filename }) => filename),
    complete,
  };
  await writeFile(snapshotManifestPath, `${JSON.stringify(snapshotManifest, null, 2)}\n`, "utf8");
  const normalizedPath = resolve(
    sourceDirectory,
    "../../../data/normalized/easy-drug",
    `${basename(rawDirectory)}.json`,
  );
  await mkdir(dirname(normalizedPath), { recursive: true });
  await writeFile(
    normalizedPath,
    `${JSON.stringify(
      {
        source: "easy-drug",
        snapshot: basename(rawDirectory),
        generatedAt: new Date().toISOString(),
        totalCount: firstResponse.body.totalCount,
        downloadedRows: items.length,
        complete,
        items: normalizedItems,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  const report = {
    analyzedAt: new Date().toISOString(),
    rawDirectory: basename(rawDirectory),
    snapshotManifest: snapshotManifestPath,
    normalizedFile: normalizedPath,
    downloadedPages: pages.length,
    expectedPages,
    pageNos,
    missingPages,
    complete,
    consistency: {
      totalCountValues,
      pageSizeValues,
      resultCodes: [...new Set(pages.map(({ response }) => response.header.resultCode))],
    },
    response: {
      envelopeKeys: Object.keys(firstResponse).sort(),
      header: firstResponse.header,
      totalCount: firstResponse.body.totalCount,
      itemsLength: items.length,
      itemFieldKeys: fieldSummary.keys,
      itemFieldStats: fieldSummary.stats,
      undocumentedItemFields: undocumentedFields,
    },
    normalizedRows: normalizedItems.length,
    coverage: calculateEasyDrugCoverage(items, firstResponse.body.totalCount),
  };

  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return { reportPath, report };
}

if (require.main === module) {
  const analysis = process.argv[2] === "--directory"
    ? analyzeEasyDrugDirectory(process.argv[3] || defaultRawDirectory)
    : analyzeEasyDrugPage();
  analysis
    .then(({ reportPath, report }) => process.stdout.write(`${JSON.stringify({ reportPath, ...report }, null, 2)}\n`))
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown analysis error.";
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    });
}
